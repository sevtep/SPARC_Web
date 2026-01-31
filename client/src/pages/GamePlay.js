import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { FiArrowLeft } from 'react-icons/fi';
import { gameService } from '../services/api';
import './GamePlay.css';

const staticGameDetails = {
  'forces-motion-basics': {
    name: 'Forces and Motion: Basics',
    slug: 'forces-motion-basics',
    description: 'Explore core physics with a driving simulator that explains forces, motion, and momentum.',
    gameUrl: 'https://ping.agaii.org/games/Force&Motion/index.html'
  }
};

const GamePlay = () => {
  const { slug } = useParams();
  const [game, setGame] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hasConsent, setHasConsent] = useState(false);
  const [showConsent, setShowConsent] = useState(false);

  useEffect(() => {
    const fetchGame = async () => {
      try {
        const response = await gameService.getGame(slug);
        const gameData = response?.data?.game;
        if (gameData) {
          setGame(gameData);
        } else {
          throw new Error('Invalid data format');
        }
      } catch (error) {
        setGame(staticGameDetails[slug] || null);
      } finally {
        setLoading(false);
      }
    };

    fetchGame();
  }, [slug]);

  useEffect(() => {
    const storedConsent = localStorage.getItem('sparc_consent');
    if (storedConsent === 'true') {
      setHasConsent(true);
      setShowConsent(false);
    } else {
      setShowConsent(true);
    }
  }, []);

  const handleConsent = () => {
    localStorage.setItem('sparc_consent', 'true');
    setHasConsent(true);
    setShowConsent(false);
  };

  if (loading) {
    return (
      <div className="game-play-page">
        <div className="container">
          <div className="loading-container">
            <div className="spinner"></div>
            <p>Loading game...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!game) {
    return (
      <div className="game-play-page">
        <div className="container">
          <div className="empty-state">
            <h2>Game Not Found</h2>
            <p>The game you're looking for doesn't exist.</p>
            <Link to="/games" className="btn btn-primary">
              <FiArrowLeft /> Back to Games
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="game-play-page">
      <div className="container">
        <div className="game-play-header">
          <Link to={`/games/${game.slug || slug}`} className="back-link">
            <FiArrowLeft /> Back to Details
          </Link>
          <div className="game-play-title">
            <h1>{game.name}</h1>
            <p>You are still inside SPARC — the game runs in an embedded window.</p>
          </div>
        </div>

        <div className="game-play-frame">
          {showConsent && !hasConsent ? (
            <div className="game-consent-card">
              <h3>Before you play</h3>
              <p>
                This Unity WebGL experience runs inside SPARC. By continuing you agree to our
                data collection and privacy terms.
              </p>
              <div className="game-consent-actions">
                <button className="btn btn-primary" onClick={handleConsent}>I Agree</button>
                <Link to="/games" className="btn btn-secondary">Back to Games</Link>
              </div>
            </div>
          ) : (
            <iframe
              title={game.name}
              src={game.gameUrl}
              frameBorder="0"
              allowFullScreen
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default GamePlay;
