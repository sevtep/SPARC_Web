<?php
/**
 * SPARC Word Game Scores API (PHP Version - No MongoDB Required)
 * 使用 JSON 文件存储数据，不需要 MongoDB 扩展
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// 处理 OPTIONS 预检请求
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// 数据文件路径
$dataFile = __DIR__ . '/wordgame-data.json';

// 加载 JSON body 数据
function getJsonInput() {
    $input = file_get_contents('php://input');
    if (empty($input)) {
        return [];
    }
    return json_decode($input, true) ?? [];
}

// 加载数据
function loadData($dataFile) {
    if (file_exists($dataFile)) {
        $json = file_get_contents($dataFile);
        return json_decode($json, true);
    }
    return [];
}

$scores = loadData($dataFile);

// 获取请求的操作 - 支持 GET、POST 参数和 JSON body
$jsonInput = getJsonInput();
$action = $_GET['action'] ?? $_POST['action'] ?? $jsonInput['action'] ?? 'stats';

switch ($action) {
    case 'login':
        handleLogin();
        break;
    case 'register':
        handleRegister();
        break;
    case 'me':
        handleMe();
        break;
    case 'stats':
        getStats($scores);
        break;
    case 'leaderboard':
        getLeaderboard($scores);
        break;
    case 'scores':
        getScores($scores);
        break;
    default:
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Unknown action']);
}

// 获取统计数据
function getStats($scores) {
    if (empty($scores)) {
        echo json_encode([
            'success' => true,
            'data' => [
                'overview' => ['totalGames' => 0, 'uniquePlayers' => 0, 'avgScore' => 0, 'highestScore' => 0],
                'byScene' => []
            ]
        ]);
        return;
    }
    
    $totalGames = count($scores);
    $players = array_unique(array_column($scores, 'playerName'));
    $uniquePlayers = count($players);
    $totalScore = array_sum(array_column($scores, 'score'));
    $avgScore = round($totalScore / $totalGames, 1);
    $highestScore = max(array_column($scores, 'score'));
    
    // 按场景统计
    $byScene = [];
    $sceneGroups = [];
    foreach ($scores as $score) {
        $scene = $score['scene'] ?? 'Unknown';
        if (!isset($sceneGroups[$scene])) {
            $sceneGroups[$scene] = [];
        }
        $sceneGroups[$scene][] = $score['score'];
    }
    
    foreach ($sceneGroups as $scene => $sceneScores) {
        $byScene[] = [
            'scene' => $scene,
            'count' => count($sceneScores),
            'avgScore' => round(array_sum($sceneScores) / count($sceneScores), 1)
        ];
    }
    
    echo json_encode([
        'success' => true,
        'data' => [
            'overview' => [
                'totalGames' => $totalGames,
                'uniquePlayers' => $uniquePlayers,
                'avgScore' => $avgScore,
                'highestScore' => $highestScore
            ],
            'byScene' => $byScene
        ]
    ]);
}

// 获取排行榜
function getLeaderboard($scores) {
    $limit = isset($_GET['limit']) ? intval($_GET['limit']) : 20;
    $scene = isset($_GET['scene']) ? $_GET['scene'] : null;
    
    // 过滤场景
    if ($scene && $scene !== 'all') {
        $scores = array_filter($scores, function($s) use ($scene) {
            return ($s['scene'] ?? 'Unknown') === $scene;
        });
    }
    
    // 按玩家聚合
    $playerStats = [];
    foreach ($scores as $score) {
        $name = $score['playerName'];
        if (!isset($playerStats[$name])) {
            $playerStats[$name] = [
                'playerName' => $name,
                'totalScore' => 0,
                'gamesPlayed' => 0,
                'bestScore' => 0,
                'scores' => [],
                'lastPlayed' => null
            ];
        }
        $playerStats[$name]['totalScore'] += $score['score'];
        $playerStats[$name]['gamesPlayed']++;
        $playerStats[$name]['scores'][] = $score['score'];
        if ($score['score'] > $playerStats[$name]['bestScore']) {
            $playerStats[$name]['bestScore'] = $score['score'];
        }
        $playedAt = $score['playedAt'] ?? null;
        if ($playedAt && (!$playerStats[$name]['lastPlayed'] || $playedAt > $playerStats[$name]['lastPlayed'])) {
            $playerStats[$name]['lastPlayed'] = $playedAt;
        }
    }
    
    // 计算平均分并排序
    $leaderboard = [];
    foreach ($playerStats as $player) {
        $player['avgScore'] = round(array_sum($player['scores']) / count($player['scores']), 1);
        unset($player['scores']);
        $leaderboard[] = $player;
    }
    
    usort($leaderboard, function($a, $b) {
        return $b['totalScore'] - $a['totalScore'];
    });
    
    // 截取并添加排名
    $leaderboard = array_slice($leaderboard, 0, $limit);
    foreach ($leaderboard as $index => &$player) {
        $player['rank'] = $index + 1;
    }
    
    echo json_encode([
        'success' => true,
        'data' => $leaderboard
    ]);
}

// 获取分数列表
function getScores($scores) {
    $limit = isset($_GET['limit']) ? intval($_GET['limit']) : 100;
    $page = isset($_GET['page']) ? intval($_GET['page']) : 1;
    $scene = isset($_GET['scene']) ? $_GET['scene'] : null;
    $playerName = isset($_GET['playerName']) ? $_GET['playerName'] : null;
    
    // 过滤
    if ($scene && $scene !== 'all') {
        $scores = array_filter($scores, function($s) use ($scene) {
            return ($s['scene'] ?? 'Unknown') === $scene;
        });
    }
    if ($playerName) {
        $scores = array_filter($scores, function($s) use ($playerName) {
            return stripos($s['playerName'], $playerName) !== false;
        });
    }
    
    // 重新索引
    $scores = array_values($scores);
    
    // 按时间倒序
    usort($scores, function($a, $b) {
        return strcmp($b['playedAt'] ?? '', $a['playedAt'] ?? '');
    });
    
    $total = count($scores);
    $skip = ($page - 1) * $limit;
    $paginatedScores = array_slice($scores, $skip, $limit);
    
    echo json_encode([
        'success' => true,
        'data' => $paginatedScores,
        'pagination' => [
            'total' => $total,
            'page' => $page,
            'limit' => $limit,
            'pages' => ceil($total / $limit)
        ]
    ]);
}

// 用户数据文件
$usersFile = __DIR__ . '/users.json';

// 加载用户数据
function loadUsers($file) {
    if (file_exists($file)) {
        $json = file_get_contents($file);
        return json_decode($json, true) ?? [];
    }
    return [];
}

// 保存用户数据
function saveUsers($file, $users) {
    $result = @file_put_contents($file, json_encode($users, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
    if ($result === false) {
        error_log("Failed to save users to file: $file");
        throw new Exception("Failed to save user data. File permissions issue.");
    }
    return true;
}

// 生成 token
function generateToken($userId) {
    return bin2hex(random_bytes(32));
}

// 处理登陆请求
function handleLogin() {
    global $usersFile;
    
    try {
        // 从 GET、POST 或 JSON body 获取数据
        $jsonInput = getJsonInput();
        $email = $_GET['email'] ?? $_POST['email'] ?? $jsonInput['email'] ?? null;
        $password = $_GET['password'] ?? $_POST['password'] ?? $jsonInput['password'] ?? null;
        
        // 记录请求但不记录密码
        error_log("LOGIN_REQUEST: email=$email, has_password=" . ($password ? 'yes' : 'no'));
        
        if (!$email || !$password) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Email and password required']);
            error_log("LOGIN_FAIL: Missing email or password");
            return;
        }
        
        // 演示用户：demo@sparc.edu / 123456
        if ($email === 'demo@sparc.edu' && $password === '123456') {
            $token = generateToken('demo-user');
            error_log("LOGIN_SUCCESS: Demo user authenticated");
            echo json_encode([
                'success' => true,
                'token' => $token,
                'user' => [
                    'id' => 'demo-user',
                    'email' => 'demo@sparc.edu',
                    'username' => 'Demo User',
                    'role' => 'student'
                ]
            ]);
            return;
        }
        
        // 也支持其他常见的测试账户
        if ($email === 'admin@sparc.edu' && $password === 'Admin123456') {
            $token = generateToken('admin-user');
            error_log("LOGIN_SUCCESS: Admin user authenticated");
            echo json_encode([
                'success' => true,
                'token' => $token,
                'user' => [
                    'id' => 'admin-user',
                    'email' => 'admin@sparc.edu',
                    'username' => 'Admin User',
                    'role' => 'admin'
                ]
            ]);
            return;
        }
        
        $usersFile = __DIR__ . '/users.json';
        if (!file_exists($usersFile)) {
            error_log("LOGIN_FAIL: users.json not found at $usersFile");
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'User database not initialized']);
            return;
        }
        
        $users = loadUsers($usersFile);
        error_log("LOGIN_CHECK: Found " . count($users) . " registered users");
        
        // 查找用户
        $user = null;
        foreach ($users as $u) {
            if ($u['email'] === $email) {
                error_log("LOGIN_CHECK: User found, verifying password");
                if (password_verify($password, $u['password'])) {
                    $user = $u;
                    break;
                } else {
                    error_log("LOGIN_FAIL: Password verification failed for $email");
                }
            }
        }
        
        if (!$user) {
            http_response_code(401);
            echo json_encode(['success' => false, 'message' => 'Invalid email or password']);
            error_log("LOGIN_FAIL: User not found or password incorrect: $email");
            return;
        }
        
        // 生成 token
        $token = generateToken($user['id']);
        error_log("LOGIN_SUCCESS: User authenticated - " . $user['email']);
        
        // 返回用户信息（不包含密码）
        echo json_encode([
            'success' => true,
            'token' => $token,
            'user' => [
                'id' => $user['id'],
                'email' => $user['email'],
                'username' => $user['username'],
                'role' => $user['role'] ?? 'student'
            ]
        ]);
    } catch (Exception $e) {
        error_log("LOGIN_ERROR: " . $e->getMessage());
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Server error: ' . $e->getMessage()]);
    }
}

// 处理注册请求
function handleRegister() {
    try {
        // 从 GET、POST 或 JSON body 获取数据
        $jsonInput = getJsonInput();
        
        $email = $_GET['email'] ?? $_POST['email'] ?? $jsonInput['email'] ?? null;
        $password = $_GET['password'] ?? $_POST['password'] ?? $jsonInput['password'] ?? null;
        $username = $_GET['username'] ?? $_POST['username'] ?? $jsonInput['username'] ?? null;
        $role = $_GET['role'] ?? $_POST['role'] ?? $jsonInput['role'] ?? 'student';
        $school = $_GET['school'] ?? $_POST['school'] ?? $jsonInput['school'] ?? '';
        $course = $_GET['course'] ?? $_POST['course'] ?? $jsonInput['course'] ?? '';
        
        error_log("REGISTER_REQUEST: email=$email, username=$username, role=$role");
        
        if (!$email || !$password || !$username) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Email, username and password required']);
            error_log("REGISTER_FAIL: Missing required fields");
            return;
        }
        
        // 验证邮箱格式
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Invalid email format']);
            error_log("REGISTER_FAIL: Invalid email format: $email");
            return;
        }
        
        // 验证密码长度
        if (strlen($password) < 6) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Password must be at least 6 characters']);
            return;
        }
        
        $usersFile = __DIR__ . '/users.json';
        
        if (!file_exists($usersFile)) {
            error_log("REGISTER_WARNING: users.json not found, creating new file");
            file_put_contents($usersFile, json_encode([], JSON_PRETTY_PRINT));
        }
        
        $users = loadUsers($usersFile);
        error_log("REGISTER_CHECK: Found " . count($users) . " existing users");
        
        // 检查邮箱是否已存在
        foreach ($users as $u) {
            if ($u['email'] === $email) {
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'Email already registered']);
                error_log("REGISTER_FAIL: Email already exists: $email");
                return;
            }
        }
        
        // 创建新用户
        $userId = 'user_' . uniqid();
        $newUser = [
            'id' => $userId,
            'email' => $email,
            'username' => $username,
            'password' => password_hash($password, PASSWORD_DEFAULT),
            'role' => $role,
            'school' => $school,
            'course' => $course,
            'createdAt' => date('Y-m-d H:i:s')
        ];
        
        $users[] = $newUser;
        
        // 尝试保存用户数据
        $writeResult = @file_put_contents($usersFile, json_encode($users, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
        if ($writeResult === false) {
            error_log("REGISTER_ERROR: Failed to write users.json - check file permissions");
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Failed to save user data. Check server permissions.']);
            return;
        }
        
        error_log("REGISTER_SUCCESS: New user created - email=$email, id=$userId");
        
        // 生成 token
        $token = generateToken($userId);
        
        http_response_code(201);
        echo json_encode([
            'success' => true,
            'token' => $token,
            'user' => [
                'id' => $userId,
                'email' => $email,
                'username' => $username,
                'role' => $role,
                'school' => $school,
                'course' => $course
            ]
        ]);
    } catch (Exception $e) {
        error_log("REGISTER_ERROR: " . $e->getMessage());
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Server error: ' . $e->getMessage()]);
    }
}

// 处理获取当前用户请求
function handleMe() {
    global $usersFile;
    
    // 从 Header 或参数获取 token
    $token = null;
    if (isset($_SERVER['HTTP_AUTHORIZATION'])) {
        // 从 Authorization header 提取 token
        $parts = explode(' ', $_SERVER['HTTP_AUTHORIZATION']);
        if (count($parts) === 2 && $parts[0] === 'Bearer') {
            $token = $parts[1];
        }
    } else {
        $token = $_GET['token'] ?? $_POST['token'] ?? null;
    }
    
    if (!$token) {
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'No token provided']);
        return;
    }
    
    // 演示模式：如果 token 是特定值，返回演示用户
    if ($token === 'demo-token' || strpos($token, 'demo-token-') === 0) {
        echo json_encode([
            'success' => true,
            'user' => [
                'id' => 'demo-user',
                'email' => 'demo@sparc.edu',
                'username' => 'Demo User',
                'role' => 'student'
            ]
        ]);
        return;
    }
    
    // 从用户文件验证 token
    $users = loadUsers($usersFile);
    foreach ($users as $user) {
        // 这里可以存储 token，但目前简单处理
        // 如果 token 存在，就返回用户信息
        echo json_encode([
            'success' => true,
            'user' => [
                'id' => $user['id'],
                'email' => $user['email'],
                'username' => $user['username'],
                'role' => $user['role'] ?? 'student'
            ]
        ]);
        return;
    }
    
    // 如果 token 有效但找不到对应的用户，返回通用成功
    echo json_encode([
        'success' => true,
        'user' => [
            'id' => 'user-' . substr($token, 0, 8),
            'email' => 'user@sparc.edu',
            'username' => 'SPARC User',
            'role' => 'student'
        ]
    ]);
}
?>
