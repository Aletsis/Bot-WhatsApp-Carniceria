import React, { useState, useEffect, useRef } from 'react';
import api from '../api/axios';
import './ChatsPage.css';

/**
 * Página de Historial de Chats
 * Muestra todas las conversaciones con clientes y permite ver el historial completo
 */
export default function ChatsPage() {
  const [conversations, setConversations] = useState([]);
  const [selectedPhone, setSelectedPhone] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [stats, setStats] = useState(null);
  const messagesEndRef = useRef(null);

  // Cargar lista de conversaciones al montar
  useEffect(() => {
    loadConversations();
    loadStats();
  }, []);

  // Auto-scroll cuando cambian los mensajes
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  /**
   * Carga la lista de conversaciones
   */
  const loadConversations = async () => {
    try {
      setLoading(true);
      const response = await api.get('/dashboard/chats', {
        params: { limit: 100, offset: 0 }
      });
      
      if (response.data.success) {
        setConversations(response.data.conversations);
      }
    } catch (error) {
      console.error('Error cargando conversaciones:', error);
      alert('Error al cargar conversaciones');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Carga las estadísticas generales
   */
  const loadStats = async () => {
    try {
      const response = await api.get('/dashboard/chats/stats');
      if (response.data.success) {
        setStats(response.data.stats);
      }
    } catch (error) {
      console.error('Error cargando estadísticas:', error);
    }
  };

  /**
   * Carga el historial de mensajes de un cliente
   */
  const loadMessages = async (telefono) => {
    try {
      setLoading(true);
      setSelectedPhone(telefono);
      
      const response = await api.get(`/dashboard/chats/${telefono}`, {
        params: { limit: 100, offset: 0 }
      });
      
      if (response.data.success) {
        // Invertir para mostrar más antiguos primero
        setMessages(response.data.messages.reverse());
        
        // Marcar como leídos
        await api.post(`/dashboard/chats/${telefono}/mark-read`);
        
        // Actualizar contador de conversaciones
        loadConversations();
      }
    } catch (error) {
      console.error('Error cargando mensajes:', error);
      alert('Error al cargar mensajes');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Busca mensajes por contenido
   */
  const handleSearch = async (e) => {
    e.preventDefault();
    
    if (!searchTerm.trim()) {
      return;
    }
    
    try {
      setLoading(true);
      const response = await api.get('/dashboard/chats/search', {
        params: { q: searchTerm, limit: 50 }
      });
      
      if (response.data.success) {
        setMessages(response.data.results);
        setSelectedPhone(null); // Limpiar selección de conversación
      }
    } catch (error) {
      console.error('Error buscando mensajes:', error);
      alert('Error en la búsqueda');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Formatea la fecha para mostrar
   */
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return date.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Ayer';
    } else {
      return date.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit' });
    }
  };

  /**
   * Trunca el último mensaje para la lista
   */
  const truncateMessage = (text, maxLength = 50) => {
    if (!text) return '';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

  return (
    <div className="chats-page">
      <div className="chats-header">
        <h1>💬 Historial de Chats</h1>
        
        {stats && (
          <div className="chats-stats">
            <div className="stat-card">
              <span className="stat-value">{stats.TotalConversaciones}</span>
              <span className="stat-label">Conversaciones</span>
            </div>
            <div className="stat-card">
              <span className="stat-value">{stats.TotalMensajes}</span>
              <span className="stat-label">Mensajes Totales</span>
            </div>
            <div className="stat-card">
              <span className="stat-value">{stats.MensajesUltimas24h}</span>
              <span className="stat-label">Últimas 24h</span>
            </div>
          </div>
        )}

        <form onSubmit={handleSearch} className="search-form">
          <input
            type="text"
            placeholder="Buscar en mensajes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          <button type="submit" className="search-btn">🔍 Buscar</button>
        </form>
      </div>

      <div className="chats-container">
        {/* Lista de conversaciones */}
        <div className="conversations-list">
          <h2>Conversaciones</h2>
          
          {loading && !selectedPhone ? (
            <div className="loading">Cargando...</div>
          ) : conversations.length === 0 ? (
            <div className="empty-state">No hay conversaciones aún</div>
          ) : (
            <div className="conversations">
              {conversations.map((conv) => (
                <div
                  key={conv.NumeroTelefono}
                  className={`conversation-item ${selectedPhone === conv.NumeroTelefono ? 'active' : ''}`}
                  onClick={() => loadMessages(conv.NumeroTelefono)}
                >
                  <div className="conv-avatar">
                    {conv.NombreCliente ? conv.NombreCliente.charAt(0).toUpperCase() : '?'}
                  </div>
                  
                  <div className="conv-info">
                    <div className="conv-header">
                      <span className="conv-name">
                        {conv.NombreCliente || conv.NumeroTelefono}
                      </span>
                      <span className="conv-time">{formatDate(conv.UltimaFecha)}</span>
                    </div>
                    
                    <div className="conv-preview">
                      <span className={`preview-indicator ${conv.TipoUltimoMensaje}`}>
                        {conv.TipoUltimoMensaje === 'enviado' ? '✓' : ''}
                      </span>
                      <span className="preview-text">
                        {truncateMessage(conv.UltimoMensaje)}
                      </span>
                      {conv.MensajesNoLeidos > 0 && (
                        <span className="unread-badge">{conv.MensajesNoLeidos}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Área de mensajes */}
        <div className="messages-area">
          {!selectedPhone && messages.length === 0 ? (
            <div className="empty-chat">
              <div className="empty-icon">💬</div>
              <p>Selecciona una conversación para ver el historial</p>
            </div>
          ) : (
            <>
              <div className="messages-header">
                <h2>
                  {selectedPhone
                    ? conversations.find(c => c.NumeroTelefono === selectedPhone)?.NombreCliente || selectedPhone
                    : 'Resultados de búsqueda'}
                </h2>
                {selectedPhone && (
                  <button 
                    className="refresh-btn" 
                    onClick={() => loadMessages(selectedPhone)}
                    disabled={loading}
                  >
                    🔄 Actualizar
                  </button>
                )}
              </div>

              <div className="messages-container">
                {loading ? (
                  <div className="loading">Cargando mensajes...</div>
                ) : messages.length === 0 ? (
                  <div className="empty-messages">No hay mensajes</div>
                ) : (
                  <>
                    {messages.map((msg) => (
                      <div
                        key={msg.MensajeID}
                        className={`message ${msg.Tipo === 'enviado' ? 'sent' : 'received'}`}
                      >
                        <div className="message-bubble">
                          <div className="message-content">{msg.Contenido}</div>
                          <div className="message-time">
                            {new Date(msg.Fecha).toLocaleString('es-MX', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                            {msg.Tipo === 'enviado' && (
                              <span className="message-status"> ✓✓</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
