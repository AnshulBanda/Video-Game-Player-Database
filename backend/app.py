from flask import Flask, request, jsonify
from flask_cors import CORS
import mysql.connector
from mysql.connector import Error
import bcrypt
from datetime import datetime, timedelta
import jwt
from functools import wraps
import os

app = Flask(__name__)
CORS(app)

# Configuration
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'your-secret-key-change-in-production')
app.config['DB_HOST'] = os.environ.get('DB_HOST', 'localhost')
app.config['DB_USER'] = os.environ.get('DB_USER', 'root')
app.config['DB_PASSWORD'] = os.environ.get('DB_PASSWORD', 'your-password')
app.config['DB_NAME'] = os.environ.get('DB_NAME', 'video_game_player_database')

# Database connection helper
def get_db_connection():
    try:
        connection = mysql.connector.connect(
            host=app.config['DB_HOST'],
            user=app.config['DB_USER'],
            password=app.config['DB_PASSWORD'],
            database=app.config['DB_NAME']
        )
        return connection
    except Error as e:
        print(f"Error connecting to MySQL: {e}")
        return None

# Authentication decorator
def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization')
        
        if not token:
            return jsonify({'error': 'Token is missing'}), 401
        
        try:
            if token.startswith('Bearer '):
                token = token.split(' ')[1]
            data = jwt.decode(token, app.config['SECRET_KEY'], algorithms=['HS256'])
            current_user_id = data['player_id']
        except jwt.ExpiredSignatureError:
            return jsonify({'error': 'Token has expired'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'error': 'Invalid token'}), 401
        
        return f(current_user_id, *args, **kwargs)
    
    return decorated

# ==================== AUTHENTICATION ENDPOINTS ====================

@app.route('/api/auth/signup', methods=['POST'])
def signup():
    data = request.get_json()
    username = data.get('username')
    email = data.get('email')
    password = data.get('password')
    
    if not username or not email or not password:
        return jsonify({'error': 'Missing required fields'}), 400
    
    connection = get_db_connection()
    if not connection:
        return jsonify({'error': 'Database connection failed'}), 500
    
    try:
        cursor = connection.cursor(dictionary=True)
        
        # Check if username or email already exists
        cursor.execute("SELECT * FROM Players WHERE username = %s OR email = %s", (username, email))
        if cursor.fetchone():
            return jsonify({'error': 'Username or email already exists'}), 409
        
        # Hash password
        password_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        
        # Insert new player
        cursor.execute(
            "INSERT INTO Players (username, email, password_hash, account_status) VALUES (%s, %s, %s, 'active')",
            (username, email, password_hash)
        )
        connection.commit()
        
        # Assign default role (Player)
        player_id = cursor.lastrowid
        cursor.execute("INSERT INTO Player_Roles (player_id, role_id) VALUES (%s, 3)", (player_id,))
        connection.commit()
        
        return jsonify({'message': 'Account created successfully', 'player_id': player_id}), 201
    
    except Error as e:
        connection.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        connection.close()

@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    
    if not username or not password:
        return jsonify({'error': 'Missing credentials'}), 400
    
    connection = get_db_connection()
    if not connection:
        return jsonify({'error': 'Database connection failed'}), 500
    
    try:
        cursor = connection.cursor(dictionary=True)
        
        # Get player
        cursor.execute("SELECT * FROM Players WHERE username = %s", (username,))
        player = cursor.fetchone()
        
        if not player:
            return jsonify({'error': 'Invalid credentials'}), 401
        
        # Check if account is active
        if player['account_status'] != 'active':
            return jsonify({'error': f'Account is {player["account_status"]}'}), 403
        
        # Verify password
        if not bcrypt.checkpw(password.encode('utf-8'), player['password_hash'].encode('utf-8')):
            return jsonify({'error': 'Invalid credentials'}), 401
        
        # Update last login
        cursor.execute("UPDATE Players SET last_login = NOW() WHERE player_id = %s", (player['player_id'],))
        connection.commit()
        
        # Generate JWT token
        token = jwt.encode({
            'player_id': player['player_id'],
            'username': player['username'],
            'exp': datetime.utcnow() + timedelta(hours=24)
        }, app.config['SECRET_KEY'], algorithm='HS256')
        
        return jsonify({
            'token': token,
            'player': {
                'player_id': player['player_id'],
                'username': player['username'],
                'email': player['email']
            }
        }), 200
    
    except Error as e:
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        connection.close()

# ==================== PLAYER PROFILE ENDPOINTS ====================

@app.route('/api/player/profile', methods=['GET'])
@token_required
def get_player_profile(current_user_id):
    connection = get_db_connection()
    if not connection:
        return jsonify({'error': 'Database connection failed'}), 500
    
    try:
        cursor = connection.cursor(dictionary=True)
        
        # Call stored procedure to get complete profile
        cursor.callproc('sp_GetPlayerProfile', [cursor.execute("SELECT username FROM Players WHERE player_id = %s", (current_user_id,)).fetchone()['username']])
        
        # Get all result sets
        results = []
        for result in cursor.stored_results():
            results.append(result.fetchall())
        
        profile_data = {
            'player_info': results[0][0] if results[0] else {},
            'characters': results[1] if len(results) > 1 else [],
            'games': results[2] if len(results) > 2 else [],
            'friends': results[3] if len(results) > 3 else []
        }
        
        return jsonify(profile_data), 200
    
    except Error as e:
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        connection.close()

@app.route('/api/player/stats', methods=['GET'])
@token_required
def get_player_stats(current_user_id):
    connection = get_db_connection()
    if not connection:
        return jsonify({'error': 'Database connection failed'}), 500
    
    try:
        cursor = connection.cursor(dictionary=True)
        
        # Get total playtime using function
        cursor.execute("SELECT fn_GetPlayerTotalPlaytime(%s) as total_playtime", (current_user_id,))
        total_playtime = cursor.fetchone()['total_playtime']
        
        # Get wins, losses, and calculate win rate
        cursor.execute("""
            SELECT 
                SUM(wins) as total_wins,
                SUM(losses) as total_losses,
                SUM(matches_played) as total_matches
            FROM Player_Games
            WHERE player_id = %s
        """, (current_user_id,))
        stats = cursor.fetchone()
        
        total_wins = stats['total_wins'] or 0
        total_losses = stats['total_losses'] or 0
        total_matches = stats['total_matches'] or 0
        win_rate = (total_wins / total_matches * 100) if total_matches > 0 else 0
        
        return jsonify({
            'total_playtime': float(total_playtime),
            'total_wins': total_wins,
            'total_losses': total_losses,
            'total_matches': total_matches,
            'win_rate': round(win_rate, 2)
        }), 200
    
    except Error as e:
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        connection.close()

# ==================== GAMES ENDPOINTS ====================

@app.route('/api/games', methods=['GET'])
@token_required
def get_all_games(current_user_id):
    connection = get_db_connection()
    if not connection:
        return jsonify({'error': 'Database connection failed'}), 500
    
    try:
        cursor = connection.cursor(dictionary=True)
        cursor.execute("SELECT * FROM Games WHERE is_active = TRUE ORDER BY title")
        games = cursor.fetchall()
        return jsonify(games), 200
    
    except Error as e:
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        connection.close()

@app.route('/api/games/player', methods=['GET'])
@token_required
def get_player_games(current_user_id):
    connection = get_db_connection()
    if not connection:
        return jsonify({'error': 'Database connection failed'}), 500
    
    try:
        cursor = connection.cursor(dictionary=True)
        cursor.execute("""
            SELECT 
                g.game_id,
                g.title,
                g.genre,
                pg.playtime_hours,
                pg.player_rank,
                pg.wins,
                pg.losses,
                pg.matches_played,
                pg.high_score,
                pg.last_played_date
            FROM Player_Games pg
            JOIN Games g ON pg.game_id = g.game_id
            WHERE pg.player_id = %s
            ORDER BY pg.playtime_hours DESC
        """, (current_user_id,))
        games = cursor.fetchall()
        return jsonify(games), 200
    
    except Error as e:
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        connection.close()

@app.route('/api/games/<int:game_id>/winrate', methods=['GET'])
@token_required
def get_game_winrate(current_user_id, game_id):
    connection = get_db_connection()
    if not connection:
        return jsonify({'error': 'Database connection failed'}), 500
    
    try:
        cursor = connection.cursor(dictionary=True)
        
        # Use function to get win rate
        cursor.execute("SELECT fn_GetPlayerWinRate(%s, %s) as win_rate", (current_user_id, game_id))
        result = cursor.fetchone()
        
        return jsonify({'win_rate': float(result['win_rate'])}), 200
    
    except Error as e:
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        connection.close()

@app.route('/api/games/match', methods=['POST'])
@token_required
def record_match(current_user_id):
    data = request.get_json()
    game_id = data.get('game_id')
    playtime = data.get('playtime')
    is_win = data.get('is_win')
    score = data.get('score')
    
    if not all([game_id, playtime is not None, is_win is not None, score is not None]):
        return jsonify({'error': 'Missing required fields'}), 400
    
    connection = get_db_connection()
    if not connection:
        return jsonify({'error': 'Database connection failed'}), 500
    
    try:
        cursor = connection.cursor()
        
        # Call stored procedure to record match (triggers will fire automatically)
        cursor.callproc('sp_RecordMatchResult', [current_user_id, game_id, playtime, is_win, score])
        connection.commit()
        
        return jsonify({'message': 'Match recorded successfully'}), 200
    
    except Error as e:
        connection.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        connection.close()

# ==================== CHARACTERS ENDPOINTS ====================

@app.route('/api/characters', methods=['GET'])
@token_required
def get_characters(current_user_id):
    connection = get_db_connection()
    if not connection:
        return jsonify({'error': 'Database connection failed'}), 500
    
    try:
        cursor = connection.cursor(dictionary=True)
        cursor.execute("""
            SELECT character_id, character_name, level, creation_date
            FROM Characters
            WHERE player_id = %s
            ORDER BY level DESC
        """, (current_user_id,))
        characters = cursor.fetchall()
        return jsonify(characters), 200
    
    except Error as e:
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        connection.close()

@app.route('/api/characters', methods=['POST'])
@token_required
def create_character(current_user_id):
    data = request.get_json()
    character_name = data.get('character_name')
    level = data.get('level', 1)
    
    if not character_name:
        return jsonify({'error': 'Character name is required'}), 400
    
    connection = get_db_connection()
    if not connection:
        return jsonify({'error': 'Database connection failed'}), 500
    
    try:
        cursor = connection.cursor(dictionary=True)
        
        cursor.execute("""
            INSERT INTO Characters (player_id, character_name, level)
            VALUES (%s, %s, %s)
        """, (current_user_id, character_name, level))
        connection.commit()
        
        character_id = cursor.lastrowid
        
        return jsonify({
            'message': 'Character created successfully',
            'character_id': character_id,
            'character_name': character_name,
            'level': level
        }), 201
    
    except Error as e:
        connection.rollback()
        if 'Duplicate entry' in str(e):
            return jsonify({'error': 'Character name already exists for this player'}), 409
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        connection.close()

@app.route('/api/characters/<int:character_id>', methods=['PUT'])
@token_required
def update_character(current_user_id, character_id):
    data = request.get_json()
    character_name = data.get('character_name')
    level = data.get('level')
    
    connection = get_db_connection()
    if not connection:
        return jsonify({'error': 'Database connection failed'}), 500
    
    try:
        cursor = connection.cursor(dictionary=True)
        
        # Verify character belongs to player
        cursor.execute("SELECT * FROM Characters WHERE character_id = %s AND player_id = %s", 
                      (character_id, current_user_id))
        if not cursor.fetchone():
            return jsonify({'error': 'Character not found'}), 404
        
        # Build update query dynamically
        updates = []
        params = []
        if character_name:
            updates.append("character_name = %s")
            params.append(character_name)
        if level is not None:
            updates.append("level = %s")
            params.append(level)
        
        if not updates:
            return jsonify({'error': 'No fields to update'}), 400
        
        params.extend([character_id, current_user_id])
        query = f"UPDATE Characters SET {', '.join(updates)} WHERE character_id = %s AND player_id = %s"
        
        cursor.execute(query, params)
        connection.commit()
        
        return jsonify({'message': 'Character updated successfully'}), 200
    
    except Error as e:
        connection.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        connection.close()

@app.route('/api/characters/<int:character_id>', methods=['DELETE'])
@token_required
def delete_character(current_user_id, character_id):
    connection = get_db_connection()
    if not connection:
        return jsonify({'error': 'Database connection failed'}), 500
    
    try:
        cursor = connection.cursor(dictionary=True)
        
        # Verify character belongs to player
        cursor.execute("SELECT * FROM Characters WHERE character_id = %s AND player_id = %s", 
                      (character_id, current_user_id))
        if not cursor.fetchone():
            return jsonify({'error': 'Character not found'}), 404
        
        cursor.execute("DELETE FROM Characters WHERE character_id = %s", (character_id,))
        connection.commit()
        
        return jsonify({'message': 'Character deleted successfully'}), 200
    
    except Error as e:
        connection.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        connection.close()

# ==================== FRIENDS ENDPOINTS ====================

@app.route('/api/friends', methods=['GET'])
@token_required
def get_friends(current_user_id):
    connection = get_db_connection()
    if not connection:
        return jsonify({'error': 'Database connection failed'}), 500
    
    try:
        cursor = connection.cursor(dictionary=True)
        cursor.execute("""
            SELECT 
                p.player_id,
                p.username,
                p.email,
                f.status
            FROM Friends f
            JOIN Players p ON p.player_id = IF(f.player_one_id = %s, f.player_two_id, f.player_one_id)
            WHERE (f.player_one_id = %s OR f.player_two_id = %s)
            AND f.status = 'accepted'
        """, (current_user_id, current_user_id, current_user_id))
        friends = cursor.fetchall()
        return jsonify(friends), 200
    
    except Error as e:
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        connection.close()

@app.route('/api/friends/requests', methods=['GET'])
@token_required
def get_friend_requests(current_user_id):
    connection = get_db_connection()
    if not connection:
        return jsonify({'error': 'Database connection failed'}), 500
    
    try:
        cursor = connection.cursor(dictionary=True)
        cursor.execute("""
            SELECT 
                p.player_id,
                p.username,
                p.email,
                f.status
            FROM Friends f
            JOIN Players p 
              ON p.player_id = 
                 CASE 
                   WHEN f.player_one_id = %s THEN f.player_two_id 
                   ELSE f.player_one_id 
                 END
            WHERE (f.player_one_id = %s OR f.player_two_id = %s)
              AND f.status = 'pending'
              AND p.player_id != %s;
        """, (current_user_id, current_user_id, current_user_id, current_user_id))

        requests = cursor.fetchall()
        return jsonify(requests), 200

    except Error as e:
        return jsonify({'error': str(e)}), 500

    finally:
        cursor.close()
        connection.close()


@app.route('/api/friends/search', methods=['GET'])
@token_required
def search_players(current_user_id):
    search_term = request.args.get('q', '')
    
    connection = get_db_connection()
    if not connection:
        return jsonify({'error': 'Database connection failed'}), 500
    
    try:
        cursor = connection.cursor(dictionary=True)
        cursor.execute("""
            SELECT player_id, username, email
            FROM Players
            WHERE (username LIKE %s OR email LIKE %s)
            AND player_id != %s
            AND account_status = 'active'
            LIMIT 20
        """, (f'%{search_term}%', f'%{search_term}%', current_user_id))
        players = cursor.fetchall()
        return jsonify(players), 200
    
    except Error as e:
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        connection.close()

@app.route('/api/friends/request', methods=['POST'])
@token_required
def send_friend_request(current_user_id):
    data = request.get_json()
    friend_id = data.get('friend_id')
    
    if not friend_id:
        return jsonify({'error': 'Friend ID is required'}), 400
    
    if friend_id == current_user_id:
        return jsonify({'error': 'Cannot send friend request to yourself'}), 400
    
    connection = get_db_connection()
    if not connection:
        return jsonify({'error': 'Database connection failed'}), 500
    
    try:
        cursor = connection.cursor(dictionary=True)
        
        # Check if friend exists
        cursor.execute("SELECT * FROM Players WHERE player_id = %s", (friend_id,))
        if not cursor.fetchone():
            return jsonify({'error': 'Player not found'}), 404
        
        # Insert friendship (trigger will handle ordering)
        cursor.execute("""
            INSERT INTO Friends (player_one_id, player_two_id, status)
            VALUES (%s, %s, 'pending')
        """, (current_user_id, friend_id))
        connection.commit()
        
        return jsonify({'message': 'Friend request sent successfully'}), 201
    
    except Error as e:
        connection.rollback()
        if 'Duplicate entry' in str(e):
            return jsonify({'error': 'Friend request already exists'}), 409
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        connection.close()

@app.route('/api/friends/accept/<int:friend_id>', methods=['PUT'])
@token_required
def accept_friend_request(current_user_id, friend_id):
    connection = get_db_connection()
    if not connection:
        return jsonify({'error': 'Database connection failed'}), 500
    
    try:
        cursor = connection.cursor(dictionary=True)
        
        # Update friendship status
        cursor.execute("""
            UPDATE Friends
            SET status = 'accepted'
            WHERE ((player_one_id = %s AND player_two_id = %s) 
                OR (player_one_id = %s AND player_two_id = %s))
            AND status = 'pending'
        """, (friend_id, current_user_id, current_user_id, friend_id))
        
        if cursor.rowcount == 0:
            return jsonify({'error': 'Friend request not found'}), 404
        
        connection.commit()
        
        return jsonify({'message': 'Friend request accepted'}), 200
    
    except Error as e:
        connection.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        connection.close()

@app.route('/api/friends/<int:friend_id>', methods=['DELETE'])
@token_required
def remove_friend(current_user_id, friend_id):
    connection = get_db_connection()
    if not connection:
        return jsonify({'error': 'Database connection failed'}), 500
    
    try:
        cursor = connection.cursor(dictionary=True)
        
        cursor.execute("""
            DELETE FROM Friends
            WHERE (player_one_id = %s AND player_two_id = %s)
            OR (player_one_id = %s AND player_two_id = %s)
        """, (current_user_id, friend_id, friend_id, current_user_id))
        
        if cursor.rowcount == 0:
            return jsonify({'error': 'Friendship not found'}), 404
        
        connection.commit()
        
        return jsonify({'message': 'Friend removed successfully'}), 200
    
    except Error as e:
        connection.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        connection.close()

# ==================== ACHIEVEMENTS ENDPOINTS ====================

@app.route('/api/achievements/player', methods=['GET'])
@token_required
def get_player_achievements(current_user_id):
    connection = get_db_connection()
    if not connection:
        return jsonify({'error': 'Database connection failed'}), 500
    
    try:
        cursor = connection.cursor(dictionary=True)
        cursor.execute("""
            SELECT 
                a.achievement_id,
                a.name,
                a.description,
                a.points_value,
                g.title as game_title,
                pa.date_earned
            FROM Player_Achievements pa
            JOIN Achievements a ON pa.achievement_id = a.achievement_id
            JOIN Games g ON a.game_id = g.game_id
            WHERE pa.player_id = %s
            ORDER BY pa.date_earned DESC
        """, (current_user_id,))
        achievements = cursor.fetchall()
        return jsonify(achievements), 200
    
    except Error as e:
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        connection.close()

@app.route('/api/achievements/game/<int:game_id>', methods=['GET'])
@token_required
def get_game_achievements(current_user_id, game_id):
    connection = get_db_connection()
    if not connection:
        return jsonify({'error': 'Database connection failed'}), 500
    
    try:
        cursor = connection.cursor(dictionary=True)
        cursor.execute("""
            SELECT 
                a.achievement_id,
                a.name,
                a.description,
                a.points_value,
                CASE WHEN pa.player_id IS NOT NULL THEN TRUE ELSE FALSE END as earned
            FROM Achievements a
            LEFT JOIN Player_Achievements pa ON a.achievement_id = pa.achievement_id AND pa.player_id = %s
            WHERE a.game_id = %s
        """, (current_user_id, game_id))
        achievements = cursor.fetchall()
        return jsonify(achievements), 200
    
    except Error as e:
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        connection.close()

# ==================== HEALTH CHECK ====================

@app.route('/api/health', methods=['GET'])
def health_check():
    connection = get_db_connection()
    if connection:
        connection.close()
        return jsonify({'status': 'healthy', 'database': 'connected'}), 200
    return jsonify({'status': 'unhealthy', 'database': 'disconnected'}), 500

# ==================== ERROR HANDLERS ====================

@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Endpoint not found'}), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({'error': 'Internal server error'}), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)