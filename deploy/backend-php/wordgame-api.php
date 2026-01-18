<?php
/**
 * SPARC Word Game Scores API (PHP Version)
 * 直接连接 MongoDB Atlas 获取 Word Game 分数数据
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// 处理 OPTIONS 预检请求
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// MongoDB 连接配置
$mongoUri = 'mongodb+srv://sevtep0v0_db_user:uwiv9jSYHlae79Ck@userdata.io1f2bi.mongodb.net/sparc_db?retryWrites=true&w=majority';

try {
    // 需要 MongoDB PHP 扩展
    $client = new MongoDB\Client($mongoUri);
    $collection = $client->sparc_db->wordgamescores;
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'message' => 'MongoDB 连接失败: ' . $e->getMessage()
    ]);
    exit();
}

// 获取请求的操作
$action = isset($_GET['action']) ? $_GET['action'] : 'stats';

switch ($action) {
    case 'stats':
        getStats($collection);
        break;
    case 'leaderboard':
        getLeaderboard($collection);
        break;
    case 'scores':
        getScores($collection);
        break;
    default:
        echo json_encode(['success' => false, 'message' => 'Unknown action']);
}

// 获取统计数据
function getStats($collection) {
    $pipeline = [
        [
            '$group' => [
                '_id' => null,
                'totalGames' => ['$sum' => 1],
                'avgScore' => ['$avg' => '$score'],
                'highestScore' => ['$max' => '$score'],
                'players' => ['$addToSet' => '$playerName']
            ]
        ],
        [
            '$project' => [
                'totalGames' => 1,
                'avgScore' => ['$round' => ['$avgScore', 1]],
                'highestScore' => 1,
                'uniquePlayers' => ['$size' => '$players'],
                '_id' => 0
            ]
        ]
    ];
    
    $result = $collection->aggregate($pipeline)->toArray();
    $overview = count($result) > 0 ? $result[0] : [
        'totalGames' => 0,
        'avgScore' => 0,
        'highestScore' => 0,
        'uniquePlayers' => 0
    ];
    
    // 按场景统计
    $scenePipeline = [
        [
            '$group' => [
                '_id' => '$scene',
                'count' => ['$sum' => 1],
                'avgScore' => ['$avg' => '$score']
            ]
        ],
        [
            '$project' => [
                'scene' => '$_id',
                'count' => 1,
                'avgScore' => ['$round' => ['$avgScore', 1]],
                '_id' => 0
            ]
        ]
    ];
    
    $byScene = $collection->aggregate($scenePipeline)->toArray();
    
    echo json_encode([
        'success' => true,
        'data' => [
            'overview' => $overview,
            'byScene' => $byScene
        ]
    ]);
}

// 获取排行榜
function getLeaderboard($collection) {
    $limit = isset($_GET['limit']) ? intval($_GET['limit']) : 20;
    $scene = isset($_GET['scene']) ? $_GET['scene'] : null;
    
    $matchStage = [];
    if ($scene && $scene !== 'all') {
        $matchStage['scene'] = $scene;
    }
    
    $pipeline = [];
    if (!empty($matchStage)) {
        $pipeline[] = ['$match' => $matchStage];
    }
    
    $pipeline = array_merge($pipeline, [
        [
            '$group' => [
                '_id' => '$playerName',
                'totalScore' => ['$sum' => '$score'],
                'avgScore' => ['$avg' => '$score'],
                'gamesPlayed' => ['$sum' => 1],
                'bestScore' => ['$max' => '$score'],
                'lastPlayed' => ['$max' => '$playedAt']
            ]
        ],
        ['$sort' => ['totalScore' => -1]],
        ['$limit' => $limit],
        [
            '$project' => [
                'playerName' => '$_id',
                'totalScore' => 1,
                'avgScore' => ['$round' => ['$avgScore', 1]],
                'gamesPlayed' => 1,
                'bestScore' => 1,
                'lastPlayed' => 1,
                '_id' => 0
            ]
        ]
    ]);
    
    $result = $collection->aggregate($pipeline)->toArray();
    
    // 添加排名
    $ranked = [];
    foreach ($result as $index => $player) {
        $player['rank'] = $index + 1;
        $ranked[] = $player;
    }
    
    echo json_encode([
        'success' => true,
        'data' => $ranked
    ]);
}

// 获取分数列表
function getScores($collection) {
    $limit = isset($_GET['limit']) ? intval($_GET['limit']) : 100;
    $page = isset($_GET['page']) ? intval($_GET['page']) : 1;
    $scene = isset($_GET['scene']) ? $_GET['scene'] : null;
    $playerName = isset($_GET['playerName']) ? $_GET['playerName'] : null;
    
    $filter = [];
    if ($scene && $scene !== 'all') {
        $filter['scene'] = $scene;
    }
    if ($playerName) {
        $filter['playerName'] = new MongoDB\BSON\Regex($playerName, 'i');
    }
    
    $skip = ($page - 1) * $limit;
    
    $options = [
        'sort' => ['playedAt' => -1],
        'skip' => $skip,
        'limit' => $limit
    ];
    
    $scores = $collection->find($filter, $options)->toArray();
    $total = $collection->countDocuments($filter);
    
    echo json_encode([
        'success' => true,
        'data' => $scores,
        'pagination' => [
            'total' => $total,
            'page' => $page,
            'limit' => $limit,
            'pages' => ceil($total / $limit)
        ]
    ]);
}
?>
