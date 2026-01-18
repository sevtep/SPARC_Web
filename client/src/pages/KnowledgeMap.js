import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX, FiLink, FiBook, FiZap } from 'react-icons/fi';
import './KnowledgeMap.css';

// 游戏模块图标和颜色配置
const gameConfig = {
  'meeting-cells': { icon: '🔴', color: '#ff6b6b', gradient: 'linear-gradient(135deg, #ff6b6b, #ee5a5a)' },
  'thumping-heart': { icon: '🫀', color: '#ff69b4', gradient: 'linear-gradient(135deg, #ff69b4, #ff1493)' },
  'need-for-speed': { icon: '💨', color: '#00D4FF', gradient: 'linear-gradient(135deg, #00D4FF, #0099cc)' },
  'cell-detective': { icon: '🔍', color: '#4ade80', gradient: 'linear-gradient(135deg, #4ade80, #22c55e)' },
  'cell-rescuer': { icon: '🚑', color: '#a855f7', gradient: 'linear-gradient(135deg, #a855f7, #9333ea)' }
};

// 静态知识地图数据
const staticKnowledgeMap = [
  {
    _id: '1',
    name: 'Meeting Cells',
    slug: 'meeting-cells',
    category: 'biology',
    description: 'Learn about the citizens of your bloodstream',
    knowledgeNodes: [
      { id: 'rbc', name: 'Red Blood Cells', description: 'Disc-shaped cells that carry oxygen using hemoglobin. Live about 120 days and are made in bone marrow.', connections: ['hemoglobin', 'wbc', 'platelets'], icon: '🔴' },
      { id: 'hemoglobin', name: 'Hemoglobin', description: 'Iron-rich protein that binds oxygen (O₂) and gives blood its red color. Each RBC contains 270 million hemoglobin molecules!', connections: ['oxygen-transport'], icon: '🧬' },
      { id: 'oxygen-transport', name: 'Oxygen Transport', description: 'Hemoglobin picks up O₂ in lungs and releases it to body tissues. CO₂ travels back to lungs for exhale.', connections: [], icon: '💨' },
      { id: 'wbc', name: 'White Blood Cells', description: 'Immune system soldiers! Include neutrophils (60%), lymphocytes (30%), monocytes, eosinophils, and basophils.', connections: ['immune', 'phagocytosis'], icon: '⚪' },
      { id: 'immune', name: 'Immune Response', description: 'WBCs detect and destroy pathogens (bacteria, viruses). They can squeeze through blood vessel walls to reach infections.', connections: ['antibodies'], icon: '🛡️' },
      { id: 'phagocytosis', name: 'Phagocytosis', description: 'Process where WBCs engulf and digest pathogens. Like Pac-Man eating enemies!', connections: [], icon: '👄' },
      { id: 'antibodies', name: 'Antibodies', description: 'Y-shaped proteins made by B-lymphocytes that tag pathogens for destruction. Remember past infections!', connections: [], icon: '🔱' },
      { id: 'platelets', name: 'Platelets', description: 'Tiny cell fragments (not full cells!) that help blood clot. Only live 8-10 days. 150,000-400,000 per microliter of blood.', connections: ['clotting', 'healing'], icon: '🩹' },
      { id: 'clotting', name: 'Blood Clotting', description: 'Complex 12-step chemical reaction. Platelets stick together and form a mesh with fibrin protein to stop bleeding.', connections: ['fibrin'], icon: '🩸' },
      { id: 'fibrin', name: 'Fibrin Network', description: 'Fibrinogen converts to fibrin threads that weave a net to trap blood cells and form a stable clot.', connections: [], icon: '🕸️' },
      { id: 'healing', name: 'Wound Healing', description: '4 phases: Hemostasis (clotting), Inflammation (WBCs clean up), Proliferation (new tissue), Remodeling (scar forms).', connections: [], icon: '✨' }
    ]
  },
  {
    _id: '2',
    name: 'Thumping Heart',
    slug: 'thumping-heart',
    category: 'biology',
    description: 'Explore how different conditions affect your heart rate',
    knowledgeNodes: [
      { id: 'chambers', name: 'Four Chambers', description: 'Right Atrium receives deoxygenated blood, Right Ventricle pumps to lungs, Left Atrium receives oxygenated blood, Left Ventricle pumps to body.', connections: ['valves', 'cardiac-cycle'], icon: '🫀' },
      { id: 'valves', name: 'Heart Valves', description: 'Tricuspid (right AV), Pulmonary, Mitral/Bicuspid (left AV), Aortic. They prevent backflow and create the "lub-dub" sound!', connections: ['heart-sounds'], icon: '🚪' },
      { id: 'heart-sounds', name: 'Heart Sounds', description: '"Lub" = AV valves closing (systole begins). "Dub" = semilunar valves closing (diastole begins). Murmurs indicate valve problems.', connections: [], icon: '🔊' },
      { id: 'cardiac-cycle', name: 'Cardiac Cycle', description: 'One complete heartbeat: Atrial systole → Ventricular systole → Diastole (relaxation). Takes about 0.8 seconds at rest.', connections: ['heart-rate'], icon: '🔄' },
      { id: 'heart-rate', name: 'Heart Rate', description: 'Normal resting HR: 60-100 BPM. Controlled by SA node (pacemaker), nervous system, and hormones like adrenaline.', connections: ['exercise', 'cold', 'sleep', 'stress'], icon: '💓' },
      { id: 'exercise', name: 'Exercise Effect', description: 'HR increases to deliver more O₂ to muscles. Can reach 150-200 BPM. Athletes have lower resting HR due to stronger hearts.', connections: ['fitness'], icon: '🏃' },
      { id: 'fitness', name: 'Cardio Fitness', description: 'Regular exercise strengthens heart muscle, increases stroke volume, lowers resting HR. Marathon runners may have 40 BPM resting!', connections: [], icon: '💪' },
      { id: 'cold', name: 'Cold Effect', description: 'Initially HR increases (shivering), then decreases to conserve heat. Blood vessels constrict to keep core warm.', connections: ['vasoconstriction'], icon: '❄️' },
      { id: 'vasoconstriction', name: 'Vasoconstriction', description: 'Blood vessels narrow to reduce heat loss through skin. Fingers and toes get cold first (peripheral circulation).', connections: [], icon: '🔻' },
      { id: 'sleep', name: 'Sleep Effect', description: 'HR drops 10-30% during deep sleep. Parasympathetic nervous system dominates. REM sleep can cause HR variability!', connections: ['circadian'], icon: '😴' },
      { id: 'circadian', name: 'Circadian Rhythm', description: 'HR follows 24-hour pattern: lowest around 3-4 AM, peaks in afternoon. Morning heart attacks more common!', connections: [], icon: '🌙' },
      { id: 'stress', name: 'Stress Effect', description: 'Fear, anxiety, excitement trigger "fight or flight" response. Adrenaline increases HR, blood pressure, and breathing rate.', connections: ['adrenaline'], icon: '😰' },
      { id: 'adrenaline', name: 'Adrenaline', description: 'Hormone from adrenal glands. Prepares body for action: dilates pupils, increases HR, redirects blood to muscles.', connections: [], icon: '⚡' }
    ]
  },
  {
    _id: '3',
    name: 'Need for Speed & Oxygen',
    slug: 'need-for-speed',
    category: 'physics',
    description: 'Physics of blood flow and oxygen delivery',
    knowledgeNodes: [
      { id: 'newton1', name: "Newton's 1st Law", description: 'Objects at rest stay at rest, objects in motion stay in motion unless acted upon by a force. Blood keeps flowing until resistance slows it.', connections: ['inertia-blood'], icon: '1️⃣' },
      { id: 'inertia-blood', name: 'Inertia in Blood', description: 'When you stand up quickly, blood "wants" to stay in your legs (inertia). Your heart must pump harder to push blood to your brain.', connections: ['orthostatic'], icon: '🧍' },
      { id: 'orthostatic', name: 'Orthostatic Drop', description: 'Dizziness when standing too fast! Blood pools in legs due to inertia. Body normally compensates by constricting vessels.', connections: [], icon: '😵' },
      { id: 'newton2', name: "Newton's 2nd Law", description: 'Force = Mass × Acceleration. Heart applies force to accelerate blood. More force needed for thicker blood or narrow vessels.', connections: ['blood-pressure'], icon: '2️⃣' },
      { id: 'blood-pressure', name: 'Blood Pressure', description: 'Force of blood on vessel walls. Systolic (heart contracts) over Diastolic (heart relaxes). Normal: 120/80 mmHg.', connections: ['hypertension'], icon: '📊' },
      { id: 'hypertension', name: 'Hypertension', description: 'High blood pressure (>140/90). Heart works harder, damages vessel walls. Silent killer - often no symptoms!', connections: [], icon: '⚠️' },
      { id: 'newton3', name: "Newton's 3rd Law", description: 'Every action has equal opposite reaction. Blood pushes vessel walls, walls push back on blood. Pulse you feel is this reaction!', connections: ['pulse', 'vessel-elasticity'], icon: '3️⃣' },
      { id: 'pulse', name: 'Pulse Wave', description: 'Pressure wave travels through arteries at 5-15 m/s (faster than blood flow!). You can feel it at wrist, neck, ankle.', connections: [], icon: '〰️' },
      { id: 'vessel-elasticity', name: 'Vessel Elasticity', description: 'Arteries stretch and recoil like rubber bands. Maintains blood pressure between heartbeats. Hardens with age.', connections: [], icon: '🎈' },
      { id: 'uphill', name: 'Climbing Uphill', description: 'Heart must pump against gravity to reach brain. Blood pressure in feet > head when standing. Giraffes have special valves!', connections: ['gravity-effects'], icon: '⛰️' },
      { id: 'gravity-effects', name: 'Gravity Effects', description: 'Veins have one-way valves to prevent backflow. Leg muscle contractions help push blood upward. Sitting too long causes pooling.', connections: [], icon: '⬇️' },
      { id: 'slipping', name: 'Friction Forces', description: 'Blood viscosity creates friction against vessel walls. Thicker blood = more resistance = harder for heart to pump.', connections: ['viscosity'], icon: '🧊' },
      { id: 'viscosity', name: 'Blood Viscosity', description: 'Determined by RBC count, plasma proteins, hydration. Dehydration thickens blood. Normal: 3-4x thicker than water.', connections: [], icon: '🍯' },
      { id: 'obstacles', name: 'Vessel Blockage', description: 'Plaque buildup (atherosclerosis) narrows vessels. Blood must squeeze through - requires more pressure. Can cause heart attack!', connections: ['atherosclerosis'], icon: '🚧' },
      { id: 'atherosclerosis', name: 'Atherosclerosis', description: 'Fatty deposits build up in artery walls. Reduces blood flow. Plaque can rupture and cause clots. Diet and exercise help prevent!', connections: [], icon: '🧈' }
    ]
  },
  {
    _id: '4',
    name: 'Cell Detective',
    slug: 'cell-detective',
    category: 'biology',
    description: 'Investigate sickle cell disease and oxygen levels',
    knowledgeNodes: [
      { id: 'normal-rbc', name: 'Normal RBC Shape', description: 'Biconcave disc shape (donut without hole). Flexible - can squeeze through tiny capillaries. Carry 4 oxygen molecules per hemoglobin.', connections: ['sickle-cell', 'oxygen-binding'], icon: '🔴' },
      { id: 'oxygen-binding', name: 'Oxygen Binding', description: 'Hemoglobin binds O₂ cooperatively - once one O₂ attaches, others bind easier. S-shaped curve. Releases O₂ in low-oxygen tissues.', connections: ['oxygen-saturation'], icon: '🔗' },
      { id: 'oxygen-saturation', name: 'Oxygen Saturation', description: 'Percentage of hemoglobin carrying oxygen. Normal: 95-100%. Below 90% is hypoxemia (dangerous). Pulse oximeter measures this!', connections: ['hypoxia'], icon: '📈' },
      { id: 'hypoxia', name: 'Hypoxia', description: 'Insufficient oxygen reaching tissues. Symptoms: confusion, rapid breathing, blue lips (cyanosis). Can damage brain and organs.', connections: [], icon: '😵‍💫' },
      { id: 'sickle-cell', name: 'Sickle Cell Disease', description: 'Genetic disorder: hemoglobin S causes RBCs to become crescent/sickle shaped when deoxygenated. Affects ~100,000 Americans.', connections: ['sickle-genetics', 'sickle-oxygen'], icon: '🌙' },
      { id: 'sickle-genetics', name: 'Sickle Genetics', description: 'Caused by single mutation in hemoglobin gene. Recessive trait - need 2 copies for disease. One copy = sickle cell trait (carriers).', connections: ['malaria-resistance'], icon: '🧬' },
      { id: 'malaria-resistance', name: 'Malaria Link', description: 'Sickle cell trait provides some protection against malaria! Why the gene persists in populations from malaria-endemic regions.', connections: [], icon: '🦟' },
      { id: 'sickle-oxygen', name: 'Sickle & Oxygen', description: 'Sickle hemoglobin carries less oxygen. RBCs become rigid and sticky when deoxygenated. Cannot squeeze through small vessels.', connections: ['vaso-occlusion'], icon: '⬇️' },
      { id: 'vaso-occlusion', name: 'Vaso-Occlusion', description: 'Sickle cells block blood vessels, cutting off oxygen to tissues. Causes intense pain (crisis) and organ damage over time.', connections: [], icon: '🚫' },
      { id: 'sickle-crisis', name: 'Pain Crisis', description: 'Episodes of severe pain when cells sickle and block vessels. Triggered by dehydration, cold, stress, infection. Requires medical care.', connections: ['treatment'], icon: '😣' },
      { id: 'treatment', name: 'Treatments', description: 'Hydroxyurea (increases fetal hemoglobin), blood transfusions, bone marrow transplant (only cure). Gene therapy in development!', connections: [], icon: '💊' },
      { id: 'detection', name: 'Detection Methods', description: 'Newborn screening (blood test), hemoglobin electrophoresis, genetic testing. Early detection allows better management.', connections: ['blood-smear'], icon: '🔬' },
      { id: 'blood-smear', name: 'Blood Smear', description: 'Microscope view of blood sample. Sickle cells visible under low oxygen. Count percentage of abnormal cells for diagnosis.', connections: [], icon: '🔍' }
    ]
  },
  {
    _id: '5',
    name: 'Cell Rescuer',
    slug: 'cell-rescuer',
    category: 'biology',
    description: 'Emergency wound repair and fighting infection',
    knowledgeNodes: [
      { id: 'wound-response', name: 'Wound Response', description: 'Injury triggers immediate response: blood vessels constrict (reduce bleeding), platelets rush to scene, immune cells mobilize.', connections: ['platelet-activation', 'inflammation'], icon: '🩸' },
      { id: 'platelet-activation', name: 'Platelet Activation', description: 'Platelets stick to damaged tissue (adhesion), change shape (spiky), release chemicals to attract more platelets (aggregation).', connections: ['platelet-count', 'clot-formation'], icon: '🩹' },
      { id: 'platelet-count', name: 'Platelet Count', description: 'More platelets = faster clotting. Normal: 150,000-400,000/μL. Below 50,000: bleeding risk. Above 400,000: clotting risk.', connections: ['thrombocytopenia'], icon: '🔢' },
      { id: 'thrombocytopenia', name: 'Low Platelets', description: 'Low platelet count. Causes: leukemia, medications, autoimmune. Symptoms: easy bruising, prolonged bleeding, petechiae (tiny red dots).', connections: [], icon: '📉' },
      { id: 'clot-formation', name: 'Clot Formation', description: 'Coagulation cascade: 12+ clotting factors activate in sequence. Fibrinogen → Fibrin threads create mesh. Platelets + fibrin = stable clot.', connections: ['fibrin-mesh'], icon: '🕸️' },
      { id: 'fibrin-mesh', name: 'Fibrin Mesh', description: 'Fibrin threads cross-link to form net. Traps RBCs, WBCs, platelets. Contracts to pull wound edges together. Vitamin K essential!', connections: [], icon: '🔗' },
      { id: 'inflammation', name: 'Inflammation', description: 'Redness, heat, swelling, pain. Blood vessels dilate, become leaky. WBCs squeeze through to fight invaders. Pus = dead WBCs + bacteria.', connections: ['bacteria', 'wbc-types'], icon: '🔥' },
      { id: 'bacteria', name: 'Bacterial Infection', description: 'Bacteria enter through wound. Multiply rapidly (doubling every 20 min!). Release toxins. Can cause sepsis if spreads to blood.', connections: ['sepsis', 'antibiotics'], icon: '🦠' },
      { id: 'sepsis', name: 'Sepsis', description: 'Life-threatening: infection spreads to bloodstream. Body attacks itself. Symptoms: fever, rapid HR, confusion. Medical emergency!', connections: [], icon: '🚨' },
      { id: 'antibiotics', name: 'Antibiotics', description: 'Medications that kill bacteria or stop their growth. Do NOT work on viruses! Overuse creates antibiotic-resistant superbugs.', connections: [], icon: '💊' },
      { id: 'wbc-types', name: 'WBC Response', description: 'Neutrophils arrive first (hours), eat bacteria. Macrophages follow (days), clean debris. Lymphocytes coordinate response.', connections: ['macrophages'], icon: '⚪' },
      { id: 'macrophages', name: 'Macrophages', description: 'Big eaters! Engulf bacteria and dead cells. Also release growth factors that signal tissue repair. Bridge between fighting and healing.', connections: [], icon: '👄' },
      { id: 'repair-proteins', name: 'Repair Proteins', description: 'Collagen rebuilds tissue structure. Growth factors stimulate new cell production. Cytokines coordinate the whole process.', connections: ['collagen', 'growth-factors'], icon: '🧱' },
      { id: 'collagen', name: 'Collagen', description: 'Most abundant protein in body! Provides structure to skin, tendons, bones. Wound collagen initially disorganized → remodels over months.', connections: ['scar-tissue'], icon: '🏗️' },
      { id: 'scar-tissue', name: 'Scar Formation', description: 'Collagen fibers align differently than normal skin. Scars have no hair follicles or sweat glands. Fade over 1-2 years.', connections: [], icon: '✨' },
      { id: 'growth-factors', name: 'Growth Factors', description: 'PDGF (from platelets), VEGF (new blood vessels), EGF (skin growth), FGF (fibroblasts). Orchestrate tissue regeneration.', connections: [], icon: '📈' }
    ]
  }
];

// 知识节点卡片组件
const KnowledgeNode = ({ node, gameColor, onClick, index }) => {
  return (
    <motion.div
      className="knowledge-node-card"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
      onClick={() => onClick(node)}
      whileHover={{ scale: 1.03, y: -4 }}
      whileTap={{ scale: 0.98 }}
      style={{ '--node-color': gameColor }}
    >
      <div className="node-icon">{node.icon}</div>
      <div className="node-title">{node.name}</div>
      {node.connections?.length > 0 && (
        <div className="node-link-count">
          <FiLink size={10} />
          <span>{node.connections.length}</span>
        </div>
      )}
    </motion.div>
  );
};

// 详情弹窗组件
const DetailModal = ({ node, game, onClose, onNavigate }) => {
  const config = gameConfig[game.slug] || { color: '#00D4FF' };
  
  const connectedNodes = node.connections?.map(connId => 
    game.knowledgeNodes.find(n => n.id === connId)
  ).filter(Boolean) || [];

  return (
    <motion.div
      className="modal-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="detail-modal"
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        onClick={e => e.stopPropagation()}
        style={{ '--modal-color': config.color }}
      >
        <button className="modal-close" onClick={onClose}>
          <FiX size={20} />
        </button>

        <div className="modal-header">
          <span className="modal-icon">{node.icon}</span>
          <h2>{node.name}</h2>
        </div>

        <div className="modal-body">
          <p className="modal-description">{node.description}</p>

          {connectedNodes.length > 0 && (
            <div className="modal-connections">
              <h4><FiLink /> Related Topics</h4>
              <div className="connection-chips">
                {connectedNodes.map(conn => (
                  <motion.button
                    key={conn.id}
                    className="connection-chip"
                    onClick={() => onNavigate(conn)}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <span className="chip-icon">{conn.icon}</span>
                    <span>{conn.name}</span>
                  </motion.button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <span className="modal-game-tag" style={{ background: config.gradient }}>
            {game.name}
          </span>
        </div>
      </motion.div>
    </motion.div>
  );
};

const KnowledgeMap = () => {
  const [games, setGames] = useState([]);
  const [selectedGame, setSelectedGame] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setGames(staticKnowledgeMap);
    setSelectedGame(staticKnowledgeMap[0]);
    setLoading(false);
  }, []);

  const handleNodeClick = (node) => {
    setSelectedNode(node);
  };

  const handleNavigateToNode = (node) => {
    setSelectedNode(node);
  };

  const currentConfig = selectedGame ? gameConfig[selectedGame.slug] : null;

  return (
    <div className="knowledge-map-page">
      <div className="container">
        <motion.div
          className="page-header"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1>
            <FiBook className="header-icon" />
            Knowledge Galaxy
          </h1>
          <p>Explore the universe of learning. Click any concept to discover more!</p>
        </motion.div>

        {loading ? (
          <div className="loading-container">
            <div className="spinner"></div>
            <p>Loading knowledge map...</p>
          </div>
        ) : (
          <div className="knowledge-map-content">
            {/* Game Tabs */}
            <div className="game-tabs">
              {games.map((game) => {
                const config = gameConfig[game.slug] || {};
                return (
                  <motion.button
                    key={game.slug}
                    className={`game-tab ${selectedGame?.slug === game.slug ? 'active' : ''}`}
                    onClick={() => setSelectedGame(game)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    style={{ 
                      '--tab-color': config.color,
                      '--tab-gradient': config.gradient
                    }}
                  >
                    <span className="tab-icon">{config.icon}</span>
                    <span className="tab-name">{game.name}</span>
                    <span className="tab-count">{game.knowledgeNodes?.length || 0}</span>
                  </motion.button>
                );
              })}
            </div>

            {/* Game Description */}
            {selectedGame && (
              <motion.div 
                className="game-description"
                key={selectedGame.slug}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                style={{ '--game-color': currentConfig?.color }}
              >
                <span className="game-category">
                  {selectedGame.category === 'biology' ? '🧬 Biology' : '⚡ Physics'}
                </span>
                <p>{selectedGame.description}</p>
              </motion.div>
            )}

            {/* Knowledge Nodes Grid */}
            {selectedGame && (
              <motion.div 
                className="nodes-grid"
                key={selectedGame.slug + '-grid'}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                {selectedGame.knowledgeNodes?.map((node, index) => (
                  <KnowledgeNode
                    key={node.id}
                    node={node}
                    gameColor={currentConfig?.color || '#00D4FF'}
                    onClick={handleNodeClick}
                    index={index}
                  />
                ))}
              </motion.div>
            )}

            {/* Stats Footer */}
            <div className="knowledge-stats">
              <div className="stat">
                <FiZap />
                <span>{games.reduce((acc, g) => acc + (g.knowledgeNodes?.length || 0), 0)} concepts</span>
              </div>
              <div className="stat">
                <FiBook />
                <span>{games.length} modules</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedNode && selectedGame && (
          <DetailModal
            node={selectedNode}
            game={selectedGame}
            onClose={() => setSelectedNode(null)}
            onNavigate={handleNavigateToNode}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default KnowledgeMap;
