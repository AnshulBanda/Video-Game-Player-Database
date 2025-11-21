import React, { useState, useEffect } from 'react';
import { User, Users, Gamepad2, Trophy, Package, UserPlus, LogOut, Home, BarChart3 } from 'lucide-react';

const API_URL = 'http://localhost:5000/api';

const GamePlayerManagement = () => {
  const [currentUser, setCurrentUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [activeTab, setActiveTab] = useState('login');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Login/Signup State
  const [loginData, setLoginData] = useState({ username: '', password: '' });
  const [signupData, setSignupData] = useState({ username: '', email: '', password: '' });

  // Game State
  const [games, setGames] = useState([]);
  const [playerGames, setPlayerGames] = useState([]);
  const [playerStats, setPlayerStats] = useState(null);

  // Friends State
  const [allPlayers, setAllPlayers] = useState([]);
  const [friends, setFriends] = useState([]);
  const [friendRequests, setFriendRequests] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Characters State
  const [characters, setCharacters] = useState([]);
  const [newCharacter, setNewCharacter] = useState({ character_name: '', level: 1 });

  // Match Recording State
  const [matchData, setMatchData] = useState({
    game_id: '',
    playtime: '',
    is_win: true,
    score: ''
  });

  // Check for existing token on mount
  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    if (savedToken && savedUser) {
      setToken(savedToken);
      setCurrentUser(JSON.parse(savedUser));
      setActiveTab('dashboard');
    }
  }, []);

  useEffect(() => {
    if (currentUser && token) {
      loadAllData();
    }
  }, [currentUser, token]);

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  };

  const apiCall = async (endpoint, method = 'GET', body = null) => {
    const headers = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const options = {
      method,
      headers,
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    try {
      const response = await fetch(`${API_URL}${endpoint}`, options);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Something went wrong');
      }

      return data;
    } catch (error) {
      throw error;
    }
  };

  const loadAllData = async () => {
    try {
      await Promise.all([
        loadGames(),
        loadPlayerGames(),
        loadPlayerStats(),
        loadCharacters(),
        loadFriends(),
        loadFriendRequests(),
      ]);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const loadGames = async () => {
    try {
      const data = await apiCall('/games');
      setGames(data);
    } catch (error) {
      console.error('Error loading games:', error);
    }
  };

  const loadPlayerGames = async () => {
    try {
      const data = await apiCall('/games/player');
      setPlayerGames(data);
    } catch (error) {
      console.error('Error loading player games:', error);
    }
  };

  const loadPlayerStats = async () => {
    try {
      const data = await apiCall('/player/stats');
      setPlayerStats(data);
    } catch (error) {
      console.error('Error loading player stats:', error);
    }
  };

  const loadCharacters = async () => {
    try {
      const data = await apiCall('/characters');
      setCharacters(data);
    } catch (error) {
      console.error('Error loading characters:', error);
    }
  };

  const loadFriends = async () => {
    try {
      const data = await apiCall('/friends');
      setFriends(data);
    } catch (error) {
      console.error('Error loading friends:', error);
    }
  };

  const loadFriendRequests = async () => {
    try {
      const data = await apiCall('/friends/requests');
      setFriendRequests(data);
    } catch (error) {
      console.error('Error loading friend requests:', error);
    }
  };

  const searchPlayers = async () => {
    if (!searchTerm.trim()) {
      setAllPlayers([]);
      return;
    }
    try {
      const data = await apiCall(`/friends/search?q=${encodeURIComponent(searchTerm)}`);
      setAllPlayers(data);
    } catch (error) {
      console.error('Error searching players:', error);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const data = await apiCall('/auth/login', 'POST', loginData);
      
      setToken(data.token);
      setCurrentUser(data.player);
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.player));
      
      setActiveTab('dashboard');
      showMessage('success', 'Login successful!');
      setLoginData({ username: '', password: '' });
    } catch (error) {
      showMessage('error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await apiCall('/auth/signup', 'POST', signupData);
      showMessage('success', 'Account created successfully! Please login.');
      setActiveTab('login');
      setSignupData({ username: '', email: '', password: '' });
    } catch (error) {
      showMessage('error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setToken(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setActiveTab('login');
    showMessage('success', 'Logged out successfully');
  };

  const handleRecordMatch = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await apiCall('/games/match', 'POST', matchData);
      showMessage('success', 'Match recorded successfully! Stats updated.');
      setMatchData({ game_id: '', playtime: '', is_win: true, score: '' });
      await loadPlayerGames();
      await loadPlayerStats();
    } catch (error) {
      showMessage('error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCharacter = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await apiCall('/characters', 'POST', newCharacter);
      showMessage('success', 'Character created successfully!');
      setNewCharacter({ character_name: '', level: 1 });
      await loadCharacters();
    } catch (error) {
      showMessage('error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCharacter = async (characterId) => {
    if (!window.confirm('Are you sure you want to delete this character?')) return;
    
    setLoading(true);

    try {
      await apiCall(`/characters/${characterId}`, 'DELETE');
      showMessage('success', 'Character deleted successfully!');
      await loadCharacters();
    } catch (error) {
      showMessage('error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSendFriendRequest = async (playerId) => {
    setLoading(true);

    try {
      await apiCall('/friends/request', 'POST', { friend_id: playerId });
      showMessage('success', 'Friend request sent!');
      await searchPlayers();
    } catch (error) {
      showMessage('error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptFriend = async (friendId) => {
    setLoading(true);

    try {
      await apiCall(`/friends/accept/${friendId}`, 'PUT');
      showMessage('success', 'Friend request accepted!');
      await loadFriends();
      await loadFriendRequests();
    } catch (error) {
      showMessage('error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFriend = async (friendId) => {
    if (!window.confirm('Are you sure you want to remove this friend?')) return;
    
    setLoading(true);

    try {
      await apiCall(`/friends/${friendId}`, 'DELETE');
      showMessage('success', 'Friend removed');
      await loadFriends();
    } catch (error) {
      showMessage('error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const LoginPage = () => (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-lg shadow-2xl p-8 w-full max-w-md">
        <div className="flex justify-center mb-6">
          <Gamepad2 className="w-16 h-16 text-purple-400" />
        </div>
        <h1 className="text-3xl font-bold text-center text-white mb-8">Game Player Portal</h1>
        
        <div className="flex mb-6 bg-gray-700 rounded-lg p-1">
          <button
            onClick={() => setActiveTab('login')}
            className={`flex-1 py-2 rounded-md transition ${activeTab === 'login' ? 'bg-purple-600 text-white' : 'text-gray-300'}`}
          >
            Login
          </button>
          <button
            onClick={() => setActiveTab('signup')}
            className={`flex-1 py-2 rounded-md transition ${activeTab === 'signup' ? 'bg-purple-600 text-white' : 'text-gray-300'}`}
          >
            Sign Up
          </button>
        </div>

        {message.text && (
          <div className={`mb-4 p-3 rounded-lg ${message.type === 'success' ? 'bg-green-600' : 'bg-red-600'} text-white text-sm`}>
            {message.text}
          </div>
        )}

        {activeTab === 'login' ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-gray-300 mb-2">Username</label>
              <input
                type="text"
                value={loginData.username}
                onChange={(e) => setLoginData({ ...loginData, username: e.target.value })}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="Enter username"
                required
              />
            </div>
            <div>
              <label className="block text-gray-300 mb-2">Password</label>
              <input
                type="password"
                value={loginData.password}
                onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="Enter password"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-lg font-semibold transition disabled:opacity-50"
            >
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <label className="block text-gray-300 mb-2">Username</label>
              <input
                type="text"
                value={signupData.username}
                onChange={(e) => setSignupData({ ...signupData, username: e.target.value })}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="Choose username"
                required
              />
            </div>
            <div>
              <label className="block text-gray-300 mb-2">Email</label>
              <input
                type="email"
                value={signupData.email}
                onChange={(e) => setSignupData({ ...signupData, email: e.target.value })}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="Enter email"
                required
              />
            </div>
            <div>
              <label className="block text-gray-300 mb-2">Password</label>
              <input
                type="password"
                value={signupData.password}
                onChange={(e) => setSignupData({ ...signupData, password: e.target.value })}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="Create password"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-lg font-semibold transition disabled:opacity-50"
            >
              {loading ? 'Creating Account...' : 'Sign Up'}
            </button>
          </form>
        )}
      </div>
    </div>
  );

  const Dashboard = () => (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
      <div className="bg-gray-800 border-b border-gray-700 p-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <Gamepad2 className="w-8 h-8 text-purple-400" />
            <h1 className="text-2xl font-bold text-white">Game Portal</h1>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 text-gray-300">
              <User className="w-5 h-5" />
              <span>{currentUser?.username}</span>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center space-x-2 bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg text-white transition"
            >
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </div>

      {message.text && (
        <div className="max-w-7xl mx-auto mt-4 px-4">
          <div className={`p-4 rounded-lg ${message.type === 'success' ? 'bg-green-600' : 'bg-red-600'} text-white`}>
            {message.text}
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto mt-6 px-4">
        <div className="flex space-x-2 bg-gray-800 p-2 rounded-lg overflow-x-auto">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-md transition whitespace-nowrap ${activeTab === 'dashboard' ? 'bg-purple-600 text-white' : 'text-gray-300 hover:bg-gray-700'}`}
          >
            <Home className="w-5 h-5" />
            <span>Dashboard</span>
          </button>
          <button
            onClick={() => setActiveTab('games')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-md transition whitespace-nowrap ${activeTab === 'games' ? 'bg-purple-600 text-white' : 'text-gray-300 hover:bg-gray-700'}`}
          >
            <Gamepad2 className="w-5 h-5" />
            <span>Games</span>
          </button>
          <button
            onClick={() => setActiveTab('characters')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-md transition whitespace-nowrap ${activeTab === 'characters' ? 'bg-purple-600 text-white' : 'text-gray-300 hover:bg-gray-700'}`}
          >
            <User className="w-5 h-5" />
            <span>Characters</span>
          </button>
          <button
            onClick={() => setActiveTab('friends')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-md transition whitespace-nowrap ${activeTab === 'friends' ? 'bg-purple-600 text-white' : 'text-gray-300 hover:bg-gray-700'}`}
          >
            <Users className="w-5 h-5" />
            <span>Friends</span>
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto mt-6 px-4 pb-8">
        {activeTab === 'dashboard' && <DashboardContent />}
        {activeTab === 'games' && <GamesContent />}
        {activeTab === 'characters' && <CharactersContent />}
        {activeTab === 'friends' && <FriendsContent />}
      </div>
    </div>
  );

  const DashboardContent = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-xl font-bold text-white mb-4 flex items-center">
          <BarChart3 className="w-6 h-6 mr-2 text-purple-400" />
          Your Statistics
        </h2>
        {playerStats ? (
          <div className="space-y-3">
            <div className="flex justify-between text-gray-300">
              <span>Total Playtime:</span>
              <span className="text-white font-semibold">{playerStats.total_playtime} hours</span>
            </div>
            <div className="flex justify-between text-gray-300">
              <span>Total Wins:</span>
              <span className="text-green-400 font-semibold">{playerStats.total_wins}</span>
            </div>
            <div className="flex justify-between text-gray-300">
              <span>Total Losses:</span>
              <span className="text-red-400 font-semibold">{playerStats.total_losses}</span>
            </div>
            <div className="flex justify-between text-gray-300">
              <span>Win Rate:</span>
              <span className="text-blue-400 font-semibold">{playerStats.win_rate}%</span>
            </div>
          </div>
        ) : (
          <p className="text-gray-400">Loading stats...</p>
        )}
      </div>

      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-xl font-bold text-white mb-4 flex items-center">
          <Trophy className="w-6 h-6 mr-2 text-yellow-400" />
          Quick Info
        </h2>
        <div className="space-y-3">
          <div className="bg-gray-700 p-3 rounded">
            <p className="text-white font-semibold">Total Games Played</p>
            <p className="text-gray-400 text-sm">{playerGames.length} games</p>
          </div>
          <div className="bg-gray-700 p-3 rounded">
            <p className="text-white font-semibold">Characters Created</p>
            <p className="text-gray-400 text-sm">{characters.length} characters</p>
          </div>
          <div className="bg-gray-700 p-3 rounded">
            <p className="text-white font-semibold">Friends</p>
            <p className="text-gray-400 text-sm">{friends.length} friends</p>
          </div>
        </div>
      </div>
    </div>
  );

  const GamesContent = () => (
    <div className="space-y-6">
      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-xl font-bold text-white mb-4">Record Match Result</h2>
        <form onSubmit={handleRecordMatch} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-gray-300 mb-2">Game</label>
            <select
              value={matchData.game_id}
              onChange={(e) => setMatchData({ ...matchData, game_id: e.target.value })}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              required
            >
              <option value="">Select a game</option>
              {games.map(game => (
                <option key={game.game_id} value={game.game_id}>{game.title}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-gray-300 mb-2">Playtime (hours)</label>
            <input
              type="number"
              step="0.1"
              value={matchData.playtime}
              onChange={(e) => setMatchData({ ...matchData, playtime: e.target.value })}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              required
            />
          </div>
          <div>
            <label className="block text-gray-300 mb-2">Result</label>
            <select
              value={matchData.is_win}
              onChange={(e) => setMatchData({ ...matchData, is_win: e.target.value === 'true' })}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="true">Win</option>
              <option value="false">Loss</option>
            </select>
          </div>
          <div>
            <label className="block text-gray-300 mb-2">Score</label>
            <input
              type="number"
              value={matchData.score}
              onChange={(e) => setMatchData({ ...matchData, score: e.target.value })}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              required
            />
          </div>
          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2 rounded-lg font-semibold transition disabled:opacity-50"
            >
              {loading ? 'Recording...' : 'Record Match'}
            </button>
          </div>
        </form>
      </div>

      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-xl font-bold text-white mb-4">Your Games</h2>
        <div className="space-y-4">
          {playerGames.length > 0 ? (
            playerGames.map(game => (
              <div key={game.game_id} className="bg-gray-700 p-4 rounded-lg">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="text-lg font-semibold text-white">{game.title}</h3>
                    <p className="text-gray-400 text-sm">{game.genre}</p>
                  </div>
                  <span className="px-3 py-1 bg-purple-600 text-white text-sm rounded-full">{game.player_rank}</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-gray-400">Playtime</p>
                    <p className="text-white font-semibold">{game.playtime_hours}h</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Wins</p>
                    <p className="text-green-400 font-semibold">{game.wins}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Losses</p>
                    <p className="text-red-400 font-semibold">{game.losses}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">High Score</p>
                    <p className="text-blue-400 font-semibold">{game.high_score}</p>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <p className="text-gray-400 text-center py-8">No games played yet. Record your first match!</p>
          )}
        </div>
      </div>
    </div>
  );

  const CharactersContent = () => (
    <div className="space-y-6">
      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-xl font-bold text-white mb-4">Create New Character</h2>
        <form onSubmit={handleCreateCharacter} className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <label className="block text-gray-300 mb-2">Character Name</label>
            <input
              type="text"
              value={newCharacter.character_name}
              onChange={(e) => setNewCharacter({ ...newCharacter, character_name: e.target.value })}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              required
            />
          </div>
          <div>
            <label className="block text-gray-300 mb-2">Starting Level</label>
            <input
              type="number"
              min="1"
              value={newCharacter.level}
              onChange={(e) => setNewCharacter({ ...newCharacter, level: parseInt(e.target.value) })}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <div className="md:col-span-3">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2 rounded-lg font-semibold transition disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Character'}
            </button>
          </div>
        </form>
      </div>

      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-xl font-bold text-white mb-4">Your Characters</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {characters.length > 0 ? (
            characters.map(char => (
              <div key={char.character_id} className="bg-gray-700 p-4 rounded-lg">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="text-lg font-semibold text-white">{char.character_name}</h3>
                    <p className="text-gray-400">Level {char.level}</p>
                  </div>
                  <button
                    onClick={() => handleDeleteCharacter(char.character_id)}
                    disabled={loading}
                    className="text-red-400 hover:text-red-300 transition disabled:opacity-50"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))
          ) : (
            <p className="text-gray-400 col-span-full text-center py-8">No characters yet. Create your first character!</p>
          )}
        </div>
      </div>
    </div>
  );

  const FriendsContent = () => (
    <div className="space-y-6">
      {friendRequests.length > 0 && (
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-bold text-white mb-4">Friend Requests</h2>
          <div className="space-y-3">
            {friendRequests.map(request => (
              <div key={request.player_id} className="bg-gray-700 p-4 rounded-lg flex justify-between items-center">
                <span className="text-white font-semibold">{request.username}</span>
                <button
                  onClick={() => handleAcceptFriend(request.player_id)}
                  disabled={loading}
                  className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg text-white transition disabled:opacity-50"
                >
                  Accept
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-xl font-bold text-white mb-4">Your Friends</h2>
        <div className="space-y-3">
          {friends.length > 0 ? (
            friends.map(friend => (
              <div key={friend.player_id} className="bg-gray-700 p-4 rounded-lg flex justify-between items-center">
                <div>
                  <span className="text-white font-semibold">{friend.username}</span>
                  <p className="text-gray-400 text-sm">{friend.email}</p>
                </div>
                <button
                  onClick={() => handleRemoveFriend(friend.player_id)}
                  disabled={loading}
                  className="text-red-400 hover:text-red-300 transition disabled:opacity-50"
                >
                  Remove
                </button>
              </div>
            ))
          ) : (
            <p className="text-gray-400 text-center py-8">No friends yet. Search and add friends below!</p>
          )}
        </div>
      </div>

      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-xl font-bold text-white mb-4">Add Friends</h2>
        <div className="mb-4">
          <div className="flex space-x-2">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && searchPlayers()}
              className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="Search by username or email..."
            />
            <button
              onClick={searchPlayers}
              disabled={loading}
              className="bg-purple-600 hover:bg-purple-700 px-6 py-2 rounded-lg text-white transition disabled:opacity-50"
            >
              Search
            </button>
          </div>
        </div>
        <div className="space-y-3">
          {allPlayers.length > 0 ? (
            allPlayers.map(player => {
              const isFriend = friends.some(f => f.player_id === player.player_id);
              const hasPendingRequest = friendRequests.some(r => r.player_id === player.player_id);
              
              return (
                <div key={player.player_id} className="bg-gray-700 p-4 rounded-lg flex justify-between items-center">
                  <div>
                    <span className="text-white font-semibold">{player.username}</span>
                    <p className="text-gray-400 text-sm">{player.email}</p>
                  </div>
                  <button
                    onClick={() => handleSendFriendRequest(player.player_id)}
                    disabled={loading || isFriend || hasPendingRequest}
                    className="flex items-center space-x-2 bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg text-white transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>{isFriend ? 'Friends' : hasPendingRequest ? 'Pending' : 'Add'}</span>
                  </button>
                </div>
              );
            })
          ) : searchTerm ? (
            <p className="text-gray-400 text-center py-8">No players found. Try a different search term.</p>
          ) : (
            <p className="text-gray-400 text-center py-8">Use the search box above to find players.</p>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div>
      {!currentUser ? <LoginPage /> : <Dashboard />}
    </div>
  );
};

export default GamePlayerManagement;