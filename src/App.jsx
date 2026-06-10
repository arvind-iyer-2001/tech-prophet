import React, { useState, useEffect } from 'react';

const CATEGORIES = {
  A: { label: 'Software Development', icon: '💻', color: 'violet' },
  B: { label: 'Big Tech Updates', icon: '🏰', color: 'crimson' },
  C: { label: 'Consumer & Hardware', icon: '⚡', color: 'amber' },
  D: { label: 'Articles & Repos', icon: '📜', color: 'emerald' },
};

export default function App() {
  const [newsData, setNewsData] = useState(null);
  const [activeArticle, setActiveArticle] = useState(null);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [likedArticles, setLikedArticles] = useState(new Set());
  const [activeSpell, setActiveSpell] = useState(null);
  const [selectedModel, setSelectedModel] = useState('gemma4:latest');

  // Load cached news and auto-fetch on startup
  useEffect(() => {
    const initApp = async () => {
      let prefModel = 'gemma4:latest';
      if (window.electronAPI.getPreferredModel) {
        try {
          prefModel = await window.electronAPI.getPreferredModel();
        } catch (e) {
          console.error('Failed to get preferred model:', e);
        }
      }
      setSelectedModel(prefModel);

      // Load cached news first so the user sees data instantly
      let shouldAutoFetch = true;
      try {
        const cacheData = await window.electronAPI.getNews();
        if (cacheData && cacheData.articles && cacheData.articles.length > 0) {
          setNewsData(cacheData);
          setActiveArticle(cacheData.articles[0]);
          if (cacheData.model) {
            setSelectedModel(cacheData.model);
          } else if (prefModel) {
            setSelectedModel(prefModel);
          }
          
          // Check if cache is fresh (less than 30 minutes old)
          if (cacheData.mtimeMs) {
            const ageMs = Date.now() - cacheData.mtimeMs;
            const thirtyMinutesMs = 30 * 60 * 1000;
            if (ageMs < thirtyMinutesMs) {
              shouldAutoFetch = false;
              console.log(`Cache is fresh (${Math.round(ageMs / 1000 / 60)} minutes old). Skipping startup fetch.`);
            } else {
              console.log(`Cache is stale (${Math.round(ageMs / 1000 / 60)} minutes old). Triggering startup fetch.`);
            }
          }
        }
      } catch (e) {
        console.error('Failed to load cached news:', e);
      }

      // Automatically trigger curation fetch on launch if cache is missing or stale
      if (shouldAutoFetch) {
        handleFetchNews(prefModel);
      }
    };

    initApp();

    // Subscribe to news.json external updates on disk
    if (window.electronAPI.onNewsUpdated) {
      const unsubscribe = window.electronAPI.onNewsUpdated(() => {
        console.log('Real-time updates triggered on news.json. Reloading...');
        loadCachedNews();
      });
      return unsubscribe;
    }
  }, []);

  const loadCachedNews = async (modelOverride) => {
    try {
      const data = await window.electronAPI.getNews();
      if (data && data.articles && data.articles.length > 0) {
        setNewsData(data);
        setActiveArticle(data.articles[0]);
        if (data.model) {
          setSelectedModel(data.model);
        } else if (modelOverride) {
          setSelectedModel(modelOverride);
        }
        return true;
      }
    } catch (e) {
      console.error('Failed to load cached news:', e);
    }
    return false;
  };

  const handleFetchNews = async (modelOverride) => {
    const targetModel = modelOverride || selectedModel;
    setLoading(true);
    setStatusMessage('Casting news-gathering spells...');
    
    // Cycle status messages to simulate wizard actions
    const messages = [
      `Summoning ${targetModel} intelligence...`,
      'Parsing RSS feed items...',
      'Sorting high-signal scrolls...',
      'Engraving portrait images in copper...',
      'Publishing The Daily Tech-Prophet...'
    ];
    
    let msgIdx = 0;
    const interval = setInterval(() => {
      if (msgIdx < messages.length) {
        setStatusMessage(messages[msgIdx]);
        msgIdx++;
      }
    }, 2500);

    try {
      await window.electronAPI.fetchNews(targetModel);
      clearInterval(interval);
      setStatusMessage('Curation complete! Formatting parchment...');
      await loadCachedNews(targetModel);
    } catch (e) {
      console.error(e);
      alert(`Magical transmission failed. Ensure your local Ollama server is running and "${targetModel}" is installed.`);
    } finally {
      clearInterval(interval);
      setLoading(false);
    }
  };

  const triggerLikeSpell = (articleId) => {
    const newLiked = new Set(likedArticles);
    if (newLiked.has(articleId)) {
      newLiked.delete(articleId);
    } else {
      newLiked.add(articleId);
      setActiveSpell(articleId);
      setTimeout(() => setActiveSpell(null), 800); // clear animation
    }
    setLikedArticles(newLiked);
  };

  const openExternalLink = (url) => {
    if (window.electronAPI.openLink) {
      window.electronAPI.openLink(url);
    } else {
      window.open(url, '_blank');
    }
  };

  const getCategory = (section) => {
    return CATEGORIES[section] || { label: 'General News', icon: '📰', color: 'slate' };
  };

  return (
    <div className="app-container">
      <div className="paper-grain" />

      {/* Loading Overlay */}
      {loading && (
        <div className="loading-overlay">
          <div className="magic-loader"></div>
          <h1>{statusMessage}</h1>
        </div>
      )}

      {/* Newspaper Masthead */}
      <header className="masthead">
        <div className="masthead-top-bar">
          <span>Vol. CCXXVI • No. 164</span>
          <span>Diagon Alley, London</span>
          <span>Price: 5 Knuts</span>
        </div>
        <h1 className="masthead-title">The Daily Tech-Prophet</h1>
        <div className="masthead-sub-bar">
          <span>"Orchestrating agentic code and compiled spells daily"</span>
          <span>{newsData?.date || '11 June 2026'}</span>
          <span>Caster: {newsData?.model || 'gemma4:latest'}</span>
        </div>
      </header>

      {/* Toolbar */}
      <div className="toolbar">
        <div>
          <strong>Curator Status: </strong> Active
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '0.9rem', fontStyle: 'italic', marginRight: '10px' }}>
            Spellcaster: <strong>{selectedModel}</strong>
          </span>
          <button className="fetch-btn" onClick={() => handleFetchNews(selectedModel)}>
            Refresh Issue 🪄
          </button>
        </div>
      </div>

      {/* Main Newspaper Body */}
      <div className="newspaper-body">
        {/* Left Side: Curation Feed */}
        <div className="stories-panel">
          {newsData ? (
            <>
              {newsData.articles.map((art, idx) => {
                const cat = getCategory(art.section);
                const isLiked = likedArticles.has(idx);
                return (
                  <div
                    key={idx}
                    className={`news-card ${activeArticle === art ? 'active' : ''}`}
                    onClick={() => setActiveArticle(art)}
                  >
                    {/* Spell flash animation element */}
                    {activeSpell === idx && <div className="spell-flash trigger" />}
                    
                    <div className="card-header">
                      <span>{cat.icon} {cat.label}</span>
                      <span>{art.source}</span>
                    </div>
                    <h2 className="card-title">{art.title}</h2>
                    <p className="card-excerpt">{art.whyItMatters}</p>
                    <div className="card-footer">
                      <span className="read-more">Read Scroll</span>
                      <span 
                        onClick={(e) => {
                          e.stopPropagation();
                          triggerLikeSpell(idx);
                        }}
                        style={{ cursor: 'pointer', fontSize: '1.1rem', color: isLiked ? '#2ecc71' : 'inherit' }}
                      >
                        {isLiked ? '🧙‍♂️ Cast (Liked)' : '🪄 Cast Spell'}
                      </span>
                    </div>
                  </div>
                );
              })}

              {/* Hidden Gem Section */}
              {newsData.hiddenGem && (
                <div
                  className={`news-card hidden-gem-card ${activeArticle === newsData.hiddenGem ? 'active' : ''}`}
                  onClick={() => setActiveArticle(newsData.hiddenGem)}
                >
                  {activeSpell === 'gem' && <div className="spell-flash trigger" />}
                  <div className="card-header">
                    <span className="gem-label">💎 Hidden Gem of the Day</span>
                    <span>{newsData.hiddenGem.source}</span>
                  </div>
                  <h2 className="card-title" style={{ color: 'var(--color-magic-gold)' }}>
                    {newsData.hiddenGem.title}
                  </h2>
                  <p className="card-excerpt">{newsData.hiddenGem.whyItMatters}</p>
                  <div className="card-footer">
                    <span className="read-more">Read Scroll</span>
                    <span 
                      onClick={(e) => {
                        e.stopPropagation();
                        triggerLikeSpell('gem');
                      }}
                      style={{ cursor: 'pointer', fontSize: '1.1rem', color: likedArticles.has('gem') ? '#2ecc71' : 'inherit' }}
                    >
                      {likedArticles.has('gem') ? '🧙‍♂️ Cast' : '🪄 Cast Spell'}
                    </span>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px 20px', fontStyle: 'italic' }}>
              <p>No issues of The Daily Tech-Prophet found on this stand.</p>
              <p style={{ marginTop: '10px', fontSize: '0.9rem' }}>Click "Fetch Latest Issue" above to publish today's scrolls.</p>
            </div>
          )}
        </div>

        {/* Right Side: Active Focus Article Detail */}
        <div className="focus-panel">
          {activeArticle ? (
            <div>
              <h1 className="article-title">{activeArticle.title}</h1>
              
              <div className="article-meta">
                <span>Source: {activeArticle.source}</span>
                <span>Category: {activeArticle.section ? getCategory(activeArticle.section).label : 'Hidden Gem'}</span>
              </div>

              {/* Animated Moving Portrait */}
              <div className="wizard-portrait-frame">
                {activeArticle.image ? (
                  <img
                    src={activeArticle.image}
                    alt={activeArticle.title}
                    className="wizard-portrait"
                    onError={(e) => {
                      // fallback to canvas cover if URL fails to load
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'flex';
                    }}
                  />
                ) : null}
                
                {/* Fallback Wizard Portrait Cover */}
                <div 
                  className="wizard-portrait-canvas"
                  style={{ display: activeArticle.image ? 'none' : 'flex' }}
                >
                  <div className="canvas-icon">
                    {activeArticle.section ? getCategory(activeArticle.section).icon : '💎'}
                  </div>
                  <div className="canvas-title">{activeArticle.title}</div>
                </div>
              </div>

              <div className="article-text drop-cap">
                <p>
                  <strong>CURATOR'S TAKEAWAY:</strong> {activeArticle.whyItMatters}
                </p>
                <p style={{ marginTop: '12px' }}>
                  {activeArticle.summary}
                </p>
              </div>

              <div className="article-footer-link">
                <span 
                  className="visit-link" 
                  onClick={() => openExternalLink(activeArticle.link)}
                >
                  Unfurl Original Scroll (Read Source) ↗
                </span>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '100px 20px', fontStyle: 'italic', opacity: 0.6 }}>
              Select a parchment from the feed to project the wizard details here.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
