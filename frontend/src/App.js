import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import './App.css';

const Chat = () => {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [socket, setSocket] = useState(null);
  const [notification, setNotification] = useState('');
  const [loader, setLoader] = useState(true);
  const messagesEndRef = useRef(null)

  useEffect(() => {
    const newSocket = io('http://localhost/socket.io'); // Change the URL accordingly
    setSocket(newSocket);

    newSocket.emit('waiting');

    newSocket.on('wait', (message) => {
      setNotification(message);
      setLoader(true);
      setMessages([]);
    });

    newSocket.on('start', (message) => {
      setNotification(message);
      setLoader(false);
    });

    return () => {
      newSocket.disconnect();
    };
  }, []);

  useEffect(() => {
    if (socket) {
      socket.on('message', (message) => {
        setMessages((prevMessages) => [...prevMessages, message]);
      });
    }
  }, [socket]);

  const sendMessage = () => {
    if (socket && inputMessage.trim() !== '' && !loader) {
      socket.emit('message', inputMessage);
      setInputMessage('');
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages]);

  return (
    <div className='App'>
      <h1>Chat Room</h1>
      <div className='chat'>
        {notification && <div>{notification}</div>}
        {loader ? <div className="loader"/> : <></>}
        {messages.map((message, index) => (
          <div key={index} className={message.sent ? 'sent' : 'received'}>{message.text}</div>
        ))}
        <div style={{ float:"left", clear: "both" }} ref={messagesEndRef}/>
      </div>
      <div className='input'>
        <input
          type="text"
          onKeyDown={(e) => {
            if (e.key === "Enter") sendMessage();
          }}
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
        />
        <button onClick={sendMessage}>Send</button>
      </div>
    </div>
  );
};

export default Chat;
