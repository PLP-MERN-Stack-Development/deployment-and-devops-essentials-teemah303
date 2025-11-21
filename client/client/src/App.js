import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import './App.css';


// Use your Render backend URL
const socket = io('https://real-time-communication-with-socket-io-3can.onrender.com');



function App() {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [username, setUsername] = useState('');
  const [tempUsername, setTempUsername] = useState('');
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (!username) return;

    setIsLoading(true);

    // Listen for incoming messages
    socket.on('receive_message', (data) => {
      setMessages(prev => [...prev, data]);
    });

    // Listen for message history when joining
    socket.on('message_history', (history) => {
      console.log('📜 Loading message history:', history.length, 'messages');
      setMessages(history);
      setIsLoading(false);
    });

    // Listen for user join/leave events
    socket.on('user_joined', (user) => {
      setMessages(prev => [...prev, { 
        username: 'System',
        message: `${user} joined the chat`,
        time: new Date().toLocaleTimeString(),
        system: true
      }]);
    });

    socket.on('user_left', (user) => {
      setMessages(prev => [...prev, { 
        username: 'System',
        message: `${user} left the chat`,
        time: new Date().toLocaleTimeString(),
        system: true
      }]);
    });

    socket.on('online_users', (users) => {
      setOnlineUsers(users);
    });

    // Typing indicators
    socket.on('user_typing', (user) => {
      setTypingUsers(prev => [...new Set([...prev, user])]);
    });

    socket.on('user_stopped_typing', (user) => {
      setTypingUsers(prev => prev.filter(u => u !== user));
    });

    // Request message history when user joins
    socket.emit('request_message_history');

    return () => {
      socket.off('receive_message');
      socket.off('message_history');
      socket.off('user_joined');
      socket.off('user_left');
      socket.off('online_users');
      socket.off('user_typing');
      socket.off('user_stopped_typing');
    };
  }, [username]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const sendMessage = () => {
    if (message.trim() && username) {
      const messageData = {
        username,
        message: message.trim(),
        time: new Date().toLocaleTimeString()
      };
      socket.emit('send_message', messageData);
      setMessage('');
      socket.emit('typing_stop', username);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      sendMessage();
    }
  };

  const handleTyping = () => {
    if (username && message) {
      socket.emit('typing_start', username);
    } else {
      socket.emit('typing_stop', username);
    }
  };

  const joinChat = () => {
    const trimmedUsername = tempUsername.trim();
    if (trimmedUsername) {
      setUsername(trimmedUsername);
      socket.emit('user_join', trimmedUsername);
    }
  };

  const handleLoginKeyPress = (e) => {
    if (e.key === 'Enter') {
      joinChat();
    }
  };

  const clearChat = () => {
    setMessages([]);
  };

  // Login Screen
  if (!username) {
    return (
      <div className="login-container">
        <div className="login-box">
          <h2>Join the Chat 💬</h2>
          <p>Enter your username to start chatting</p>
          <input
            type="text"
            placeholder="Enter your username..."
            value={tempUsername}
            onChange={(e) => setTempUsername(e.target.value)}
            onKeyPress={handleLoginKeyPress}
            autoFocus
          />
          <button onClick={joinChat}>Join Chat</button>
        </div>
      </div>
    );
  }

  // Chat Screen
  return (
    <div className="App">
      <div className="chat-container">
        <div className="chat-header">
          <h2>Real-Time Chat 💬</h2>
          <div className="user-info">
            <span>Welcome, {username}!</span>
            <div className="online-count">
              Online: {onlineUsers.length} users • Messages: {messages.length}
            </div>
          </div>
        </div>

        <div className="chat-sidebar">
          <h3>Online Users 👥</h3>
          <div className="users-list">
            {onlineUsers.map((user, index) => (
              <div key={index} className="user-item">
                <span className="online-dot"></span>
                {user}
                {user === username && <span> (You)</span>}
              </div>
            ))}
          </div>
          <div className="sidebar-actions">
            <button onClick={clearChat} className="clear-btn">
              Clear Chat
            </button>
          </div>
        </div>

        <div className="chat-main">
          <div className="messages-container">
            {isLoading && (
              <div className="loading-message">
                <div className="loading-spinner"></div>
                Loading message history...
              </div>
            )}
            
            {messages.map((msg, index) => (
              <div key={msg.messageId || index} className={msg.system ? "system-message" : "message"}>
                {msg.system ? (
                  <em>{msg.message}</em>
                ) : (
                  <>
                    <strong>{msg.username}:</strong> {msg.message}
                    <span className="time">{msg.time}</span>
                  </>
                )}
              </div>
            ))}
            
            {typingUsers.length > 0 && (
              <div className="typing-indicator">
                {typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          <div className="input-container">
            <input
              type="text"
              placeholder="Type your message..."
              value={message}
              onChange={(e) => {
                setMessage(e.target.value);
                handleTyping();
              }}
              onKeyPress={handleKeyPress}
            />
            <button onClick={sendMessage}>Send</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
