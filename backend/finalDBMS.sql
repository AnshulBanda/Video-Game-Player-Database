CREATE DATABASE IF NOT EXISTS video_game_player_database;
USE video_game_player_database;

-- Players Table
CREATE TABLE Players (
	player_id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    date_created TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP NULL,
    account_status ENUM('active', 'suspended', 'banned', 'inactive') NOT NULL DEFAULT 'active',
    team_id INT NULL -- Foreign key added later
);

-- Games Table
CREATE TABLE Games (
	game_id INT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(100) NOT NULL UNIQUE,
    genre VARCHAR(50),
    developer_name VARCHAR(100) NOT NULL,
    date_added TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    popularity_score DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
    total_matches_played BIGINT UNSIGNED NOT NULL DEFAULT 0,
    global_high_score INT UNSIGNED NOT NULL DEFAULT 0,
    total_hours_played BIGINT UNSIGNED NOT NULL DEFAULT 0
);

-- Teams Table 
CREATE TABLE Teams (
    team_id INT PRIMARY KEY AUTO_INCREMENT,
    team_name VARCHAR(50) NOT NULL UNIQUE,
    creation_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Add the foreign key from Players to Teams after both tables are created.
ALTER TABLE Players
ADD CONSTRAINT fk_player_team
FOREIGN KEY (team_id) REFERENCES Teams(team_id) ON DELETE SET NULL;

-- Characters Table
CREATE TABLE Characters (
	character_id INT PRIMARY KEY AUTO_INCREMENT,
    player_id INT NOT NULL,
    character_name VARCHAR(50) NOT NULL,
    `level` INT UNSIGNED NOT NULL DEFAULT 1,
    creation_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (player_id) REFERENCES Players(player_id) ON DELETE CASCADE,
    UNIQUE KEY unique_character_per_player (player_id, character_name)
);

-- Roles Table
CREATE TABLE Roles (
    role_id INT PRIMARY KEY AUTO_INCREMENT,
    role_name VARCHAR(50) NOT NULL UNIQUE
);

-- Achievements Table
CREATE TABLE Achievements (
    achievement_id INT PRIMARY KEY AUTO_INCREMENT,
    game_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    points_value INT NOT NULL DEFAULT 0,
    FOREIGN KEY (game_id) REFERENCES Games(game_id) ON DELETE CASCADE,
    UNIQUE KEY unique_achievement_per_game (game_id, name)
);

-- Items Table
CREATE TABLE Items (
    item_id INT PRIMARY KEY AUTO_INCREMENT,
    game_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    item_type ENUM('Weapon', 'Armor', 'Cosmetic', 'Consumable') NOT NULL,
    rarity ENUM('Common', 'Uncommon', 'Rare', 'Epic', 'Legendary') NOT NULL,
    FOREIGN KEY (game_id) REFERENCES Games(game_id) ON DELETE CASCADE,
    UNIQUE KEY unique_item_per_game (game_id, name)
);


-- JUNCTION TABLES FOR M:N RELATIONSHIPS

-- Player_Games Table (with stats)
CREATE TABLE Player_Games (
	player_id INT NOT NULL,
    game_id INT NOT NULL,
    playtime_hours DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    last_played_date TIMESTAMP NULL,
    player_rank VARCHAR(50) NOT NULL DEFAULT 'Unranked',
    wins INT UNSIGNED NOT NULL DEFAULT 0,
    losses INT UNSIGNED NOT NULL DEFAULT 0,
    matches_played INT UNSIGNED NOT NULL DEFAULT 0,
    high_score INT UNSIGNED NOT NULL DEFAULT 0,
    PRIMARY KEY (player_id, game_id),
    FOREIGN KEY (player_id) REFERENCES Players(player_id) ON DELETE CASCADE,
	FOREIGN KEY (game_id) REFERENCES Games(game_id) ON DELETE CASCADE
);

-- Player_Roles Table
CREATE TABLE Player_Roles (
    player_id INT NOT NULL,
    role_id INT NOT NULL,
    PRIMARY KEY (player_id, role_id),
    FOREIGN KEY (player_id) REFERENCES Players(player_id) ON DELETE CASCADE,
    FOREIGN KEY (role_id) REFERENCES Roles(role_id) ON DELETE CASCADE
);

-- Player_Achievements Table
CREATE TABLE Player_Achievements (
    player_id INT NOT NULL,
    achievement_id INT NOT NULL,
    date_earned TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (player_id, achievement_id),
    FOREIGN KEY (player_id) REFERENCES Players(player_id) ON DELETE CASCADE,
    FOREIGN KEY (achievement_id) REFERENCES Achievements(achievement_id) ON DELETE CASCADE
);

-- Player_Inventories Table
CREATE TABLE Player_Inventories (
    inventory_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    player_id INT NOT NULL,
    item_id INT NOT NULL,
    quantity INT UNSIGNED NOT NULL DEFAULT 1,
    acquired_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (player_id) REFERENCES Players(player_id) ON DELETE CASCADE,
    FOREIGN KEY (item_id) REFERENCES Items(item_id) ON DELETE CASCADE,
    UNIQUE KEY unique_item_per_player (player_id, item_id)
);

-- Friends Table
CREATE TABLE Friends (
    player_one_id INT NOT NULL,
    player_two_id INT NOT NULL,
    status ENUM('pending', 'accepted', 'blocked') NOT NULL DEFAULT 'pending',
    CHECK (player_one_id <> player_two_id),
    PRIMARY KEY (player_one_id, player_two_id),
    FOREIGN KEY (player_one_id) REFERENCES Players(player_id) ON DELETE CASCADE,
    FOREIGN KEY (player_two_id) REFERENCES Players(player_id) ON DELETE CASCADE
);


-- INDEXES FOR PERFORMANCE
CREATE INDEX idx_players_username ON Players(username);
CREATE INDEX idx_characters_player ON Characters(player_id);
CREATE INDEX idx_achievements_game ON Achievements(game_id);
CREATE INDEX idx_players_team ON Players(team_id);

-- Populate Core Tables with No or Few Dependencies

-- Populate the Roles table first.
INSERT INTO Roles (role_id, role_name) VALUES
(1, 'Admin'),
(2, 'Moderator'),
(3, 'Player');

-- Populate the Games table.
INSERT INTO Games (game_id, title, genre, developer_name) VALUES
(1, 'CyberSphere Odyssey', 'RPG', 'Quantum Realm Studios'),
(2, 'Starfall Arena', 'MOBA', 'Celestial Games'),
(3, 'Pixel Raiders', 'Platformer', 'Retro Forge'),
(4, 'Aetherium Echoes', 'JRPG', 'Chrono Weavers Inc.'),
(5, 'Void Drifters', 'Space Sim', 'Galaxy Forge'),
(6, 'Giga Fortress', 'Tower Defense', 'Bulwark Interactive'),
(7, 'Chrono Clash', 'Fighting', 'Time Punch Studios'),
(8, 'Rogue Ascent', 'Roguelike', 'Endless Dungeons'),
(9, 'Sole Survivor', 'Battle Royale', 'Last Stand Games'),
(10, 'Hearth & Home', 'Life Sim', 'Cozy Corner Devs'),
(11, 'Mecha Mayhem', 'Action', 'Titan Works'),
(12, 'Cryptic Trails', 'Mystery', 'Shadowplay Ent.'),
(13, 'Speed Demons', 'Racing', 'Velocity Games');

-- Populate the Players table (team_id will be updated later).
INSERT INTO Players (player_id, username, email, password_hash, account_status) VALUES
(1, 'ShadowDragon', 's.dragon@email.com', '$2a$12$...', 'active'),
(2, 'PixelWizard', 'wiz@pixel.net', '$2a$12$...', 'active'),
(3, 'VortexViper', 'vv@gamers.com', '$2a$12$...', 'suspended'),
(4, 'NightBlade', 'nb@blade.org', '$2a$12$...', 'active'),
(5, 'ChaosMaster', 'master@chaos.net', '$2a$12$...', 'banned'),
(6, 'CyberGladiator', 'cyberg@email.com', '$2a$12$...', 'active'),
(7, 'RogueShadow', 'rogue@email.com', '$2a$12$...', 'active'),
(8, 'QuantumLeap', 'qleap@email.com', '$2a$12$...', 'active'),
(9, 'StarFire', 'sfire@email.com', '$2a$12$...', 'active'),
(10, 'IcePhoenix', 'phoenix@email.com', '$2a$12$...', 'inactive'),
(11, 'SteelSavvy', 'savvy@email.com', '$2a$12$...', 'active'),
(12, 'DreamWeaver', 'dreamw@email.com', '$2a$12$...', 'active'),
(13, 'GhostRider', 'grider@email.com', '$2a$12$...', 'suspended'),
(14, 'BlazeRunner', 'blaze@email.com', '$2a$12$...', 'active'),
(15, 'LunaTick', 'luna@email.com', '$2a$12$...', 'active');

-- Populate the Teams table (without leader information).
INSERT INTO Teams (team_id, team_name) VALUES
(1, 'Quantum Phantoms'),
(2, 'Celestial Sentinels'),
(3, 'Void Walkers'),
(4, 'The Firebirds');

-- Now, update the Players table to assign them to their teams.
UPDATE Players SET team_id = 1 WHERE player_id IN (1, 2);
UPDATE Players SET team_id = 2 WHERE player_id IN (4);
UPDATE Players SET team_id = 3 WHERE player_id IN (6, 7, 8);
UPDATE Players SET team_id = 4 WHERE player_id IN (9, 14, 15);


-- Step 2: Populate Dependent and Junction Tables

-- Populate the Characters table.
INSERT INTO Characters (player_id, character_name, `level`) VALUES
(1, 'Ignis', 55), (1, 'Aerion', 42), (2, 'Merlinus', 70), (4, 'Kael', 65),
(6, 'Jax', 80), (7, 'Silas', 50), (8, 'Nova', 99), (9, 'Fia', 75), (15, 'Selene', 60);

-- Populate the Items table.
INSERT INTO Items (game_id, name, description, item_type, rarity) VALUES
(1, 'Sword of a Thousand Truths', 'A legendary blade.', 'Weapon', 'Legendary'),
(1, 'Health Potion', 'Restores 50 HP.', 'Consumable', 'Common'),
(2, 'Cosmic Mantle', 'A cape that shimmers with starlight.', 'Cosmetic', 'Epic'),
(3, 'Jump Boots', 'Allows for a double jump.', 'Armor', 'Rare');

-- Populate the Achievements table.
INSERT INTO Achievements (game_id, name, description, points_value) VALUES
(1, 'Dragon Slayer', 'Defeat the Ancient Dragon in CyberSphere Odyssey.', 100),
(1, 'Level 50', 'Reach level 50 with any character.', 50),
(2, 'First Win', 'Win your first match in Starfall Arena.', 10),
(5, 'Galaxy Explorer', 'Visit every star system in Void Drifters.', 100),
(9, 'Victory Royale', 'Be the sole survivor in a match.', 75),
(11, 'Titanfall', 'Destroy 100 enemy mechs.', 50);

-- Assign roles to all players.
INSERT INTO Player_Roles (player_id, role_id) VALUES
(1, 3), (2, 3), (3, 3), (4, 2), (5, 1), (6, 3), (7, 3), (8, 3),
(9, 3), (10, 3), (11, 3), (12, 3), (13, 3), (14, 3), (15, 3);

-- Add records showing which players play which games, including their stats.
INSERT INTO Player_Games (player_id, game_id, playtime_hours, player_rank, wins, losses, matches_played, high_score) VALUES
(1, 1, 150.5, 'Diamond', 120, 40, 160, 8500), (1, 2, 75.2, 'Gold', 50, 25, 75, 1200),
(2, 1, 250.0, 'Master', 200, 50, 250, 9950), (4, 2, 300.7, 'Platinum', 310, 150, 460, 1500),
(1, 5, 45.5, 'Silver', 20, 15, 35, 4300), (2, 9, 120.0, 'Platinum', 15, 30, 45, 100),
(6, 1, 200.2, 'Platinum', 180, 70, 250, 9100), (6, 11, 95.8, 'Gold', 100, 45, 145, 12000),
(7, 8, 88.0, 'Diamond', 500, 210, 710, 56000), (8, 4, 150.5, 'Master', 90, 10, 100, 15200),
(9, 2, 60.1, 'Bronze', 10, 40, 50, 800), (9, 9, 210.3, 'Diamond', 35, 50, 85, 100),
(12, 10, 350.0, 'N/A', 0, 0, 0, 150000), (14, 13, 180.7, 'Gold', 80, 15, 95, 25000),
(15, 12, 40.0, 'Silver', 5, 2, 7, 750);

-- Record that some players have earned achievements.
INSERT INTO Player_Achievements (player_id, achievement_id, date_earned) VALUES
(1, 1, '2025-09-10 20:00:00'), (1, 2, '2025-09-08 15:30:00'), (2, 2, '2025-08-20 18:00:00'),
(6, 5, NOW()), (9, 4, NOW()), (8, 2, NOW());

-- Add items to players' inventories.
INSERT INTO Player_Inventories (player_id, item_id, quantity) VALUES
(1, 1, 1), (1, 2, 10), (2, 2, 5), (4, 3, 1);

-- Create some friendships.
INSERT INTO Friends (player_one_id, player_two_id, status) VALUES
(1, 2, 'accepted'), (1, 4, 'pending'), (4, 2, 'accepted'), (1, 6, 'accepted'),
(6, 7, 'accepted'), (7, 8, 'accepted'), (9, 1, 'pending'), (14, 4, 'blocked'), (15, 9, 'accepted');

SELECT * FROM Players;

SELECT * FROM Games;

SELECT * FROM Teams;

SELECT
    p.username,
    t.team_name
FROM
    Players p
LEFT JOIN
    Teams t ON p.team_id = t.team_id;
    
SELECT
    p.username,
    c.character_name,
    c.level
FROM
    Players p
JOIN
    Characters c ON p.player_id = c.player_id
WHERE
    p.username = 'ShadowDragon';
    
SELECT
    t.team_name,
    COUNT(p.player_id) AS number_of_members
FROM
    Teams t
JOIN
    Players p ON t.team_id = p.team_id
GROUP BY
    t.team_name;


SELECT
    g.title,
    AVG(pg.playtime_hours) AS average_playtime
FROM
    Games g
JOIN
    Player_Games pg ON g.game_id = pg.game_id
WHERE
    g.title = 'CyberSphere Odyssey'
GROUP BY
    g.title;
    

SELECT
    p.username,
    pg.player_rank,
    pg.wins,
    pg.losses
FROM
    Player_Games pg
JOIN
    Players p ON pg.player_id = p.player_id
JOIN
    Games g ON pg.game_id = g.game_id
WHERE
    g.title = 'Starfall Arena'
ORDER BY
    pg.wins DESC;
    
SELECT
    p.username,
    a.name AS achievement_name,
    g.title AS game_title,
    pa.date_earned
FROM
    Player_Achievements pa
JOIN
    Players p ON pa.player_id = p.player_id
JOIN
    Achievements a ON pa.achievement_id = a.achievement_id
JOIN
    Games g ON a.game_id = g.game_id
WHERE
    p.username = 'ShadowDragon';
    
SELECT * from video_game_player_database;
SHOW DATABASES;
SHOW TABLES;

DELIMITER //

CREATE TRIGGER trg_UpdateGameStats_After_PlayerGamesUpdate
AFTER UPDATE ON Player_Games
FOR EACH ROW
BEGIN
    -- Calculate the difference in playtime and matches played from this one session
    DECLARE hours_diff DECIMAL(10, 2);
    DECLARE matches_diff BIGINT;

    SET hours_diff = NEW.playtime_hours - OLD.playtime_hours;
    SET matches_diff = NEW.matches_played - OLD.matches_played;

    -- Update the main Games table with the new totals
    UPDATE Games
    SET
        total_hours_played = total_hours_played + hours_diff,
        total_matches_played = total_matches_played + matches_diff,
        -- Update the global high score if the player's new score is higher
        global_high_score = GREATEST(global_high_score, NEW.high_score)
    WHERE
        game_id = NEW.game_id;
END;
//

CREATE TRIGGER trg_UpdateGameStats_After_PlayerGamesInsert
AFTER INSERT ON Player_Games
FOR EACH ROW
BEGIN
    -- This handles when a player plays a game for the very first time
    UPDATE Games
    SET
        total_hours_played = total_hours_played + NEW.playtime_hours,
        total_matches_played = total_matches_played + NEW.matches_played,
        global_high_score = GREATEST(global_high_score, NEW.high_score)
    WHERE
        game_id = NEW.game_id;
END;
//

DELIMITER ;

SELECT title, total_hours_played, total_matches_played, global_high_score
FROM Games
WHERE game_id = 3;

INSERT INTO Player_Games (player_id, game_id, playtime_hours, matches_played, high_score)
VALUES (1, 3, 5.5, 10, 1500);

SELECT title, total_hours_played, total_matches_played, global_high_score
FROM Games
WHERE game_id = 3;

SELECT title, total_hours_played, total_matches_played, global_high_score
FROM Games
WHERE game_id = 1;

CALL sp_RecordMatchResult(
    1,     -- p_player_id: ShadowDragon
    1,     -- p_game_id: CyberSphere Odyssey
    2.0,   -- p_playtime_added: 2 hours
    TRUE,  -- p_is_win: true
    9000   -- p_score: 9000
);

SELECT title, total_hours_played, total_matches_played, global_high_score
FROM Games
WHERE game_id = 1;

DELIMITER //

CREATE TRIGGER trg_EnforceFriendshipOrder
BEFORE INSERT ON Friends
FOR EACH ROW
BEGIN
    DECLARE temp_id INT;
    
    -- Ensure player_one_id is always the smaller ID
    IF NEW.player_one_id > NEW.player_two_id THEN
        SET temp_id = NEW.player_one_id;
        SET NEW.player_one_id = NEW.player_two_id;
        SET NEW.player_two_id = temp_id;
    END IF;
    
    -- Prevent a player from friending themselves
    IF NEW.player_one_id = NEW.player_two_id THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'A player cannot be friends with themselves.';
    END IF;
END;
//

DELIMITER ;

-- This will be stored as (1, 2, 'pending')
INSERT INTO Friends (player_one_id, player_two_id, status) VALUES (2, 1, 'pending');

-- This will now fail with a "Duplicate entry" error, which is correct!
INSERT INTO Friends (player_one_id, player_two_id, status) VALUES (1, 2, 'pending');

INSERT INTO Friends (player_one_id, player_two_id, status) VALUES (11, 3, 'pending');

INSERT INTO Friends (player_one_id, player_two_id, status) VALUES (4, 4, 'pending');
SELECT * FROM Friends WHERE player_one_id = 3;
SELECT * FROM Friends WHERE player_one_id = 4;

DELIMITER //

CREATE FUNCTION fn_GetPlayerWinRate(
    p_player_id INT,
    p_game_id INT
)
RETURNS DECIMAL(5, 2)
DETERMINISTIC
READS SQL DATA
BEGIN
    DECLARE v_wins INT;
    DECLARE v_matches INT;
    DECLARE v_win_rate DECIMAL(5, 2);

    -- Get the player's stats for that game
    SELECT wins, matches_played
    INTO v_wins, v_matches
    FROM Player_Games
    WHERE player_id = p_player_id AND game_id = p_game_id;

    -- Calculate win rate, handling division by zero
    IF v_matches IS NULL OR v_matches = 0 THEN
        SET v_win_rate = 0.00;
    ELSE
        SET v_win_rate = (v_wins / v_matches) * 100;
    END IF;

    RETURN v_win_rate;
END //
-- This "//" now marks the end of the CREATE FUNCTION command

-- Change the delimiter back to the default semicolon
DELIMITER ;

SELECT 
    username,
    fn_GetPlayerWinRate(player_id, 1) AS 'CyberSphere Win Rate %'
FROM Players
WHERE player_id = 1;

DELIMITER //

CREATE FUNCTION fn_GetPlayerTotalPlaytime(
    p_player_id INT
)
RETURNS DECIMAL(10, 2)
DETERMINISTIC
READS SQL DATA
BEGIN
    DECLARE v_total_playtime DECIMAL(10, 2);

    SELECT SUM(playtime_hours)
    INTO v_total_playtime
    FROM Player_Games
    WHERE player_id = p_player_id;

    RETURN IFNULL(v_total_playtime, 0.00);
END;
//

DELIMITER ;

SELECT 
    username,
    fn_GetPlayerTotalPlaytime(player_id) AS 'Total Hours Logged'
FROM Players;


DELIMITER //

CREATE PROCEDURE sp_RecordMatchResult(
    IN p_player_id INT,
    IN p_game_id INT,
    IN p_playtime_added DECIMAL(10, 2),
    IN p_is_win BOOLEAN,
    IN p_score INT
)
BEGIN
    -- This command will INSERT a new row if the player hasn't played the game before,
    -- or UPDATE the existing row if they have.
    INSERT INTO Player_Games (
        player_id, 
        game_id, 
        playtime_hours, 
        last_played_date, 
        wins, 
        losses, 
        matches_played, 
        high_score
    )
    VALUES (
        p_player_id, 
        p_game_id, 
        p_playtime_added, 
        NOW(), 
        IF(p_is_win, 1, 0), 
        IF(p_is_win, 0, 1), 
        1, 
        p_score
    )
    ON DUPLICATE KEY UPDATE
        playtime_hours = playtime_hours + VALUES(playtime_hours),
        last_played_date = VALUES(last_played_date),
        wins = wins + VALUES(wins),
        losses = losses + VALUES(losses),
        matches_played = matches_played + VALUES(matches_played),
        high_score = GREATEST(high_score, VALUES(high_score));
END;
//

DELIMITER ;

-- Player 1 (ShadowDragon) just finished a 1.5-hour match
-- in Game 1 (CyberSphere Odyssey). They won and scored 7500.
CALL sp_RecordMatchResult(1, 1, 1.5, TRUE, 7500);

-- Player 4 (NightBlade) finished a 0.8-hour match
-- in Game 2 (Starfall Arena). They lost and scored 900.
CALL sp_RecordMatchResult(4, 2, 0.8, FALSE, 900);

DELIMITER //

CREATE PROCEDURE sp_GetPlayerProfile(
    IN p_username VARCHAR(50)
)
BEGIN
    DECLARE v_player_id INT;

    -- Find the player_id from the username
    SELECT player_id INTO v_player_id
    FROM Players
    WHERE username = p_username;

    IF v_player_id IS NOT NULL THEN
        -- Result 1: Core Player and Team Info
        SELECT 
            p.username, 
            p.email, 
            p.date_created, 
            p.last_login, 
            p.account_status,
            t.team_name
        FROM Players p
        LEFT JOIN Teams t ON p.team_id = t.team_id
        WHERE p.player_id = v_player_id;

        -- Result 2: Player's Characters
        SELECT 
            character_name, 
            `level`, 
            creation_date 
        FROM Characters
        WHERE player_id = v_player_id;

        -- Result 3: Player's Game Statistics
        SELECT
            g.title,
            pg.player_rank,
            pg.playtime_hours,
            pg.wins,
            pg.losses,
            pg.matches_played,
            pg.high_score
        FROM Player_Games pg
        JOIN Games g ON pg.game_id = g.game_id
        WHERE pg.player_id = v_player_id
        ORDER BY pg.playtime_hours DESC;
        
        -- Result 4: Player's Friends
        SELECT 
            p.username AS friend_username,
            f.status
        FROM Friends f
        JOIN Players p ON p.player_id = IF(f.player_one_id = v_player_id, f.player_two_id, f.player_one_id)
        WHERE (f.player_one_id = v_player_id OR f.player_two_id = v_player_id)
          AND f.status = 'accepted';

    ELSE
    
        SELECT 'Player not found.' AS Error;
    END IF;
END;
//

DELIMITER ;


CALL sp_GetPlayerProfile('ShadowDragon');

DESCRIBE Players;
SELECT * FROM Players;
SELECT * FROM Games;

SELECT * FROM Players WHERE username = 'AnshulB';