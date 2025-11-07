import React, { useState, useEffect, useRef } from 'react';
import { DashboardLayout } from '../components/layout';
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
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchMode, setSearchMode] = useState('conversations'); // 'conversations' o 'messages'
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [showMessages, setShowMessages] = useState(false); // Para navegación móvil
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [messagesOffset, setMessagesOffset] = useState(0);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);

  // Cargar lista de conversaciones al montar
  useEffect(() => {
    loadConversations();
  }, []);

  // Auto-scroll al final cuando se cargan mensajes iniciales
  useEffect(() => {
    if (messages.length > 0 && !loadingOlder) {
      // Solo scroll automático para la carga inicial (primera vez)
      if (messagesOffset <= 50) {
        setTimeout(() => scrollToBottom(), 100);
      }
    }
  }, [messages.length, loadingOlder, messagesOffset]);

  // Resetear estado de envío cuando se cambia de conversación
  useEffect(() => {
    setNewMessage('');
    setSending(false);
  }, [selectedPhone]);

  // Manejar redimensión de pantalla
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768 && showMessages) {
        // En pantalla grande, mostrar ambas vistas
        setShowMessages(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [showMessages]);

  // Detector de scroll para cargar mensajes antiguos y mostrar botón de scroll
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      
      // Si el usuario hace scroll hasta arriba (o cerca), cargar más mensajes
      if (scrollTop <= 100 && hasMoreMessages && !loadingOlder) {
        loadOlderMessages();
      }
      
      // Mostrar botón de scroll hacia abajo si no está en el final
      const isNearBottom = scrollTop + clientHeight >= scrollHeight - 100;
      setShowScrollToBottom(!isNearBottom && messages.length > 0);
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [selectedPhone, hasMoreMessages, loadingOlder, messages.length]);

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
   * Carga el historial de mensajes más recientes de un cliente
   */
  const loadMessages = async (telefono, resetMessages = true) => {
    try {
      setLoading(true);
      setSelectedPhone(telefono);
      setShowMessages(true); // Mostrar vista de mensajes en móvil
      
      if (resetMessages) {
        setMessages([]);
        setMessagesOffset(0);
        setHasMoreMessages(true);
      }
      
      const response = await api.get(`/dashboard/chats/${telefono}`, {
        params: { 
          limit: 50, // Cargar menos mensajes inicialmente
          offset: 0 
        }
      });
      
      if (response.data.success) {
        // Los mensajes vienen ordenados por fecha DESC, los revertimos para mostrar cronológicamente
        const rawMessages = response.data.messages || [];
        // Eliminar duplicados por MensajeID
        const uniqueMessages = rawMessages.filter((msg, index, self) => 
          index === self.findIndex(m => m.MensajeID === msg.MensajeID)
        );
        const newMessages = uniqueMessages.reverse();
        setMessages(newMessages);
        setMessagesOffset(newMessages.length);
        setHasMoreMessages(newMessages.length === 50); // Si vienen menos de 50, no hay más
        
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
   * Carga mensajes más antiguos (scroll hacia arriba)
   */
  const loadOlderMessages = async () => {
    if (!selectedPhone || !hasMoreMessages || loadingOlder) return;

    try {
      setLoadingOlder(true);
      
      const response = await api.get(`/dashboard/chats/${selectedPhone}`, {
        params: { 
          limit: 50,
          offset: messagesOffset 
        }
      });
      
      if (response.data.success) {
        const rawOlderMessages = response.data.messages || [];
        // Eliminar duplicados por MensajeID
        const uniqueOlderMessages = rawOlderMessages.filter((msg, index, self) => 
          index === self.findIndex(m => m.MensajeID === msg.MensajeID)
        );
        const olderMessages = uniqueOlderMessages.reverse(); // Revertir para orden cronológico
        
        if (olderMessages.length > 0) {
          // Guardar posición actual del scroll
          const container = messagesContainerRef.current;
          const scrollHeight = container?.scrollHeight || 0;
          
          // Evitar duplicados al combinar con mensajes existentes
          setMessages(prev => {
            const existingIds = new Set(prev.map(m => m.MensajeID));
            const newUniqueMessages = olderMessages.filter(m => !existingIds.has(m.MensajeID));
            return [...newUniqueMessages, ...prev];
          });
          setMessagesOffset(prev => prev + olderMessages.length);
          setHasMoreMessages(olderMessages.length === 50);
          
          // Restaurar posición de scroll después de que React re-renderice
          setTimeout(() => {
            if (container) {
              const newScrollHeight = container.scrollHeight;
              container.scrollTop = newScrollHeight - scrollHeight;
            }
          }, 0);
        } else {
          setHasMoreMessages(false);
        }
      }
    } catch (error) {
      console.error('Error cargando mensajes antiguos:', error);
    } finally {
      setLoadingOlder(false);
    }
  };

  /**
   * Busca mensajes por contenido
   */
  const handleSearch = async (e) => {
    e.preventDefault();
    
    if (!searchTerm.trim()) {
      // Si está vacío, recargar lista normal
      loadConversations();
      setMessages([]);
      setSelectedPhone(null);
      return;
    }
    
    try {
      setLoading(true);
      
      if (searchMode === 'conversations') {
        // Buscar por nombre o teléfono (filtrar conversaciones)
        const response = await api.get('/dashboard/chats/search-conversations', {
          params: { q: searchTerm, limit: 50 }
        });
        
        if (response.data.success) {
          setConversations(response.data.conversations);
          setMessages([]);
          setSelectedPhone(null);
        }
      } else {
        // Buscar en contenido de mensajes
        const response = await api.get('/dashboard/chats/search', {
          params: { q: searchTerm, limit: 50 }
        });
        
        if (response.data.success) {
          setMessages(response.data.results);
          setSelectedPhone(null);
        }
      }
    } catch (error) {
      console.error('Error buscando:', error);
      alert('Error en la búsqueda');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Limpia la búsqueda y vuelve a la vista normal
   */
  const clearSearch = () => {
    setSearchTerm('');
    setMessages([]);
    setSelectedPhone(null);
    setShowMessages(false);
    setMessagesOffset(0);
    setHasMoreMessages(true);
    loadConversations();
  };

  /**
   * Vuelve a la lista de conversaciones (navegación móvil)
   */
  const goBackToConversations = () => {
    setShowMessages(false);
    setSelectedPhone(null);
    setMessages([]);
    setMessagesOffset(0);
    setHasMoreMessages(true);
  };

  /**
   * Detecta si estamos en dispositivo móvil
   */
  const isMobile = () => {
    return window.innerWidth <= 768;
  };

  /**
   * Envía un mensaje al cliente seleccionado
   */
  const sendMessage = async (e) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !selectedPhone) {
      return;
    }
    
    try {
      setSending(true);
      
      const response = await api.post(`/dashboard/chats/${selectedPhone}/send`, {
        mensaje: newMessage
      });
      
      if (response.data.success) {
        // Limpiar input
        setNewMessage('');
        
        // Recargar mensajes para mostrar el nuevo
        await loadMessages(selectedPhone);
        
        // Actualizar lista de conversaciones (cambió el último mensaje)
        loadConversations();
        
        // Scroll al final
        setTimeout(() => {
          const messagesContainer = document.querySelector('.messages-container');
          if (messagesContainer) {
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
          }
        }, 100);
      }
    } catch (error) {
      console.error('Error enviando mensaje:', error);
      const errorMsg = error.response?.data?.message || 'Error al enviar el mensaje. Intenta de nuevo.';
      alert(errorMsg);
    } finally {
      setSending(false);
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

  /**
   * Renderiza el contenido del mensaje con formato especial para botones
   */
  const renderMessageContent = (msg) => {
    try {
      const metadata = msg.MetadataWhatsApp;
      
      // Si es un mensaje recibido con botón (respuesta del cliente)
      if (msg.Tipo === 'recibido' && metadata?.buttonId) {
        return (
          <div className="button-response">
            <span className="button-icon">🔘</span>
            <span className="button-text">{msg.Contenido}</span>
          </div>
        );
      }
      
      // Si el contenido tiene botones (mensaje enviado con opciones)
      if (msg.Contenido.includes('[Botones:')) {
        const parts = msg.Contenido.split('[Botones:');
        const mainText = parts[0].trim();
        const buttonsText = parts[1]?.replace(']', '').trim();
        
        if (buttonsText) {
          const buttons = buttonsText.split(',').map(b => b.trim());
          return (
            <div className="message-with-buttons">
              <div className="message-text">{mainText}</div>
              <div className="message-buttons">
                {buttons.map((btn, idx) => (
                  <div key={idx} className="message-button-item">
                    {btn}
                  </div>
                ))}
              </div>
            </div>
          );
        }
      }
      
      // Mensaje normal
      return <div className="message-text">{msg.Contenido}</div>;
    } catch (error) {
      return <div className="message-text">{msg.Contenido}</div>;
    }
  };

  return (
    <DashboardLayout>
      <div className="chats-page">
        <div className="chats-header">
          <h1>💬 Historial de Chats</h1>

        <form onSubmit={handleSearch} className="search-form">
          <div className="search-input-group">
            <input
              type="text"
              placeholder={searchMode === 'conversations' 
                ? "Buscar por nombre o teléfono..." 
                : "Buscar en contenido de mensajes..."}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
            {searchTerm && (
              <button 
                type="button" 
                onClick={clearSearch}
                className="clear-search-btn"
                title="Limpiar búsqueda"
              >
                ✕
              </button>
            )}
          </div>
          
          <div className="search-mode-toggle">
            <button
              type="button"
              className={`mode-btn ${searchMode === 'conversations' ? 'active' : ''}`}
              onClick={() => setSearchMode('conversations')}
              title="Buscar conversaciones por nombre o teléfono"
            >
              👥 Contactos
            </button>
            <button
              type="button"
              className={`mode-btn ${searchMode === 'messages' ? 'active' : ''}`}
              onClick={() => setSearchMode('messages')}
              title="Buscar en contenido de mensajes"
            >
              💬 Mensajes
            </button>
          </div>
          
          <button type="submit" className="search-btn" disabled={!searchTerm.trim()}>
            🔍 Buscar
          </button>
        </form>
      </div>

      <div className="chats-container">
        {/* Lista de conversaciones */}
        <div className={`conversations-list ${showMessages && isMobile() ? 'hidden-mobile' : ''}`}>
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
        <div className={`messages-area ${showMessages ? 'active' : ''}`}>
          {!selectedPhone && messages.length === 0 ? (
            <div className="empty-chat">
              <div className="empty-icon">💬</div>
              <p>Selecciona una conversación para ver el historial</p>
            </div>
          ) : (
            <>
              <div className="messages-header" onClick={isMobile() ? goBackToConversations : undefined}>
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

              <div className="messages-container" ref={messagesContainerRef}>
                {loading ? (
                  <div className="loading">Cargando mensajes...</div>
                ) : messages.length === 0 ? (
                  <div className="empty-messages">No hay mensajes</div>
                ) : (
                  <>
                    {/* Indicador de carga para mensajes antiguos */}
                    {loadingOlder && (
                      <div className="loading-older">
                        <div className="loading-spinner">⏳</div>
                        <span>Cargando mensajes anteriores...</span>
                      </div>
                    )}
                    
                    {/* Indicador de que no hay más mensajes */}
                    {!hasMoreMessages && messages.length > 0 && (
                      <div className="no-more-messages">
                        📜 Inicio de la conversación
                      </div>
                    )}
                    
                    {messages.map((msg, index) => (
                      <div
                        key={`${msg.MensajeID}-${index}`}
                        className={`message ${msg.Tipo === 'enviado' ? 'sent' : 'received'}`}
                      >
                        <div className="message-bubble">
                          <div className="message-content">
                            {renderMessageContent(msg)}
                          </div>
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
                
                {/* Botón de scroll hacia abajo */}
                {showScrollToBottom && (
                  <button 
                    className="scroll-to-bottom-btn"
                    onClick={scrollToBottom}
                    title="Ir a los mensajes más recientes"
                  >
                    ↓
                  </button>
                )}
              </div>

              {/* Input de mensaje - solo visible cuando hay una conversación seleccionada */}
              {selectedPhone && (
                <div className="message-input-container">
                  <form onSubmit={sendMessage} className="message-input-form">
                    <textarea
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Escribe un mensaje..."
                      className="message-input"
                      rows="3"
                      disabled={sending}
                      onKeyDown={(e) => {
                        // Enviar con Ctrl+Enter
                        if (e.key === 'Enter' && e.ctrlKey) {
                          e.preventDefault();
                          sendMessage(e);
                        }
                      }}
                    />
                    <button
                      type="submit"
                      className="send-button"
                      disabled={!newMessage.trim() || sending}
                    >
                      {sending ? '⏳ Enviando...' : '✉️ Enviar'}
                    </button>
                  </form>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
    </DashboardLayout>
  );
}
