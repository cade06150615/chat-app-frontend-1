import io from 'socket.io-client';
import axios from 'axios';

const BACKEND_URL = 'http://localhost:3000'; // 部署後更新為 Render 後端 URL
const socket = io(BACKEND_URL);

// 元素選擇
const messages = document.getElementById('messages');
const messageInput = document.getElementById('messageInput');
const sendButton = document.getElementById('sendButton');
const emojiBtn = document.getElementById('emojiBtn');
const emojiPicker = document.getElementById('emojiPicker');
const attachBtn = document.getElementById('attachBtn');
const fileInput = document.getElementById('fileInput');
const attachmentPreview = document.getElementById('attachmentPreview');
const imageModal = document.getElementById('imageModal');
const modalImage = document.getElementById('modalImage');
const modalClose = document.querySelectorAll('.modal-close');
const callBtn = document.getElementById('callBtn');
const videoBtn = document.getElementById('videoBtn');
const callModal = document.getElementById('callModal');
const videoModal = document.getElementById('videoModal');
const endCallBtn = document.getElementById('endCallBtn');
const endVideoBtn = document.getElementById('endVideoBtn');
const callModalName = document.getElementById('callModalName');
const callModalInitial = document.getElementById('callModalInitial');
const callStatus = document.getElementById('callStatus');
const searchInput = document.getElementById('searchInput');
const searchResults = document.getElementById('searchResults');
const friendsList = document.getElementById('friendsList');
const activeFriendName = document.getElementById('activeFriendName');
const activeFriendInitial = document.getElementById('activeFriendInitial');
const currentUserInitial = document.getElementById('currentUserInitial');

// 當前用戶（模擬，實際應從後端獲取）
let currentUser = { id: 'user1', name: '我', avatar: 'from-indigo-500 to-purple-500' };
let currentFriend = null;

// WebSocket 事件
socket.on('connect', () => {
    console.log('已連接到 WebSocket 服務器');
    socket.emit('join', currentUser.id);
});

socket.on('message', (data) => {
    if (data.senderId === currentFriend?.id || data.senderId === currentUser.id) {
        if (data.image) {
            addImageMessage(data.image, data.senderId === currentUser.id ? 'self' : 'friend');
        } else {
            addMessage(data.text, data.senderId === currentUser.id ? 'self' : 'friend');
        }
    }
});

socket.on('typing', (data) => {
    if (data.userId === currentFriend?.id) {
        showTypingIndicator();
        setTimeout(removeTypingIndicator, 3000);
    }
});

// 獲取好友列表
async function fetchFriends() {
    try {
        const response = await axios.get(`${BACKEND_URL}/api/friends`);
        const friends = response.data;
        renderFriends(friends);
        if (friends.length > 0) {
            currentFriend = friends[0];
            activeFriendName.textContent = currentFriend.name;
            activeFriendInitial.textContent = currentFriend.name.charAt(0);
            fetchMessages(currentFriend.id);
        }
    } catch (error) {
        console.error('獲取好友列表失敗：', error);
    }
}

// 獲取與特定好友的聊天記錄
async function fetchMessages(friendId) {
    try {
        const response = await axios.get(`${BACKEND_URL}/api/messages/${friendId}`);
        messages.innerHTML = '<div class="text-center text-gray-500 text-sm mb-4">今天 12:00</div>';
        response.data.forEach(msg => {
            if (msg.image) {
                addImageMessage(msg.image, msg.senderId === currentUser.id ? 'self' : 'friend');
            } else {
                addMessage(msg.text, msg.senderId === currentUser.id ? 'self' : 'friend');
            }
        });
    } catch (error) {
        console.error('獲取消息失敗：', error);
    }
}

// 渲染好友列表
function renderFriends(friends) {
    friendsList.innerHTML = '';
    friends.forEach(friend => {
        const friendItem = document.createElement('div');
        friendItem.className = `friend-item flex items-center justify-between p-3 rounded-lg mb-2 cursor-pointer ${friend.id === currentFriend?.id ? 'active' : ''}`;
        friendItem.dataset.id = friend.id;
        friendItem.innerHTML = `
            <div class="flex items-center">
                <div class="w-10 h-10 rounded-full bg-gradient-to-r ${friend.avatar} flex items-center justify-center text-white font-bold relative">
                    ${friend.name.charAt(0)}
                    <span class="status-dot ${friend.status === 'online' ? 'bg-green-500' : 'bg-gray-400'}"></span>
                </div>
                <div class="ml-3">
                    <h3 class="font-medium text-gray-800">${friend.name}</h3>
                    <p class="text-xs text-gray-500 truncate w-32">${friend.lastMessage || ''}</p>
                </div>
            </div>
            <div class="text-xs text-gray-400">${friend.time || ''}</div>
        `;
        friendItem.addEventListener('click', async () => {
            document.querySelectorAll('.friend-item').forEach(item => item.classList.remove('active'));
            friendItem.classList.add('active');
            currentFriend = friends.find(f => f.id === friendItem.dataset.id);
            activeFriendName.textContent = currentFriend.name;
            activeFriendInitial.textContent = currentFriend.name.charAt(0);
            callModalName.textContent = currentFriend.name;
            callModalInitial.textContent = currentFriend.name.charAt(0);
            await fetchMessages(currentFriend.id);
        });
        friendsList.appendChild(friendItem);
    });
}

// 發送消息
async function sendMessage() {
    const text = messageInput.value.trim();
    const filePreview = document.querySelector('#attachmentPreview img');
    if (text || filePreview) {
        const messageData = { senderId: currentUser.id, receiverId: currentFriend.id, text };
        if (filePreview) {
            messageData.image = filePreview.src;
        }
        socket.emit('message', messageData);
        messageInput.value = '';
        attachmentPreview.innerHTML = '';
        attachmentPreview.classList.add('hidden');
    }
}

// 處理文件上傳
fileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (file) {
        const formData = new FormData();
        formData.append('file', file);
        try {
            const response = await axios.post(`${BACKEND_URL}/api/upload`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            attachmentPreview.innerHTML = `<img src="${response.data.url}" class="image-preview">`;
            attachmentPreview.classList.remove('hidden');
        } catch (error) {
            console.error('文件上傳失敗：', error);
        }
    }
});

// 輸入指示器
messageInput.addEventListener('input', () => {
    socket.emit('typing', { userId: currentUser.id, receiverId: currentFriend.id });
});

// 添加文字消息
function addMessage(text, sender) {
    const messageDiv = document.createElement('div');
    messageDiv.className = sender === 'self' ? 'flex justify-end mb-4' : 'flex mb-4';
    const now = new Date();
    const timeString = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    const messageContent = document.createElement('div');
    messageContent.className = 'relative';
    const bubble = document.createElement('div');
    bubble.className = `message-bubble rounded-2xl p-3 ${sender === 'self' ? 'bg-indigo-600 text-white' : 'bg-white border border-gray-200 text-gray-800 shadow-sm'}`;
    bubble.textContent = text;
    const timeElement = document.createElement('div');
    timeElement.className = `message-time ${sender === 'self' ? 'text-right text-indigo-200' : 'text-gray-400'}`;
    timeElement.textContent = timeString;
    messageContent.appendChild(bubble);
    messageContent.appendChild(timeElement);
    if (sender === 'self') {
        const options = document.createElement('div');
        options.className = 'message-options';
        options.innerHTML = `
            <button class="text-gray-400 hover:text-indigo-600 p-1">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                </svg>
            </button>
        `;
        messageContent.appendChild(options);
        const status = document.createElement('div');
        status.className = 'message-status text-right text-indigo-200';
        status.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
            已讀
        `;
        messageContent.appendChild(status);
    } else {
        bubble.addEventListener('dblclick', () => addReaction(bubble));
    }
    messageDiv.appendChild(messageContent);
    messages.appendChild(messageDiv);
    messages.scrollTop = messages.scrollHeight;
}

// 添加圖片消息
function addImageMessage(src, sender) {
    const messageDiv = document.createElement('div');
    messageDiv.className = sender === 'self' ? 'flex justify-end mb-4' : 'flex mb-4';
    const now = new Date();
    const timeString = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    const messageContent = document.createElement('div');
    messageContent.className = 'relative';
    const bubble = document.createElement('div');
    bubble.className = `message-bubble rounded-2xl p-2 ${sender === 'self' ? 'bg-indigo-600 text-white' : 'bg-white border border-gray-200 text-gray-800 shadow-sm'}`;
    const image = document.createElement('img');
    image.src = src;
    image.className = 'image-preview';
    image.addEventListener('click', () => {
        modalImage.src = src;
        imageModal.classList.add('show');
    });
    bubble.appendChild(image);
    const timeElement = document.createElement('div');
    timeElement.className = `message-time ${sender === 'self' ? 'text-right text-indigo-200' : 'text-gray-400'}`;
    timeElement.textContent = timeString;
    messageContent.appendChild(bubble);
    messageContent.appendChild(timeElement);
    messageDiv.appendChild(messageContent);
    messages.appendChild(messageDiv);
    messages.scrollTop = messages.scrollHeight;
}

// 添加反應
function addReaction(bubble) {
    if (bubble.querySelector('.reaction')) return;
    const reaction = document.createElement('div');
    reaction.className = 'reaction';
    reaction.innerHTML = `
        <span class="reaction-emoji">❤️</span>
        <span class="reaction-count">1</span>
    `;
    bubble.appendChild(reaction);
}

// 顯示輸入指示器
function showTypingIndicator() {
    const typingDiv = document.createElement('div');
    typingDiv.id = 'typingIndicator';
    typingDiv.className = 'flex mb-4';
    typingDiv.innerHTML = '<div class="bg-white border border-gray-200 rounded-2xl p-3 typing-indicator shadow-sm">正在輸入<span>.</span><span>.</span><span>.</span></div>';
    messages.appendChild(typingDiv);
    messages.scrollTop = messages.scrollHeight;
}

// 移除輸入指示器
function removeTypingIndicator() {
    const typingIndicator = document.getElementById('typingIndicator');
    if (typingIndicator) typingIndicator.remove();
}

// 渲染表情選擇器
const emojis = ['😀', '😁', '😂', '🤣', '😃', '😄', '😅', '😆', '😉', '😊', '😋', '😎', '😍', '😘', '🥰', '😗', '😙', '😚', '🙂', '🤗', '🤩', '🤔', '🤨', '😐', '😑', '😶', '🙄', '😏', '😣', '😥', '😮', '🤐', '😯', '😪', '😫', '😴', '😌', '😛', '😜', '😝', '🤤', '😒', '😓', '😔', '😕', '🙃', '🤑', '😲'];
function renderEmojiPicker() {
    const emojiGrid = emojiPicker.querySelector('.emoji-grid');
    emojiGrid.innerHTML = '';
    emojis.slice(0, 49).forEach(emoji => {
        const emojiBtn = document.createElement('div');
        emojiBtn.className = 'emoji-btn';
        emojiBtn.textContent = emoji;
        emojiBtn.addEventListener('click', () => {
            messageInput.value += emoji;
            messageInput.focus();
            emojiPicker.style.display = 'none';
        });
        emojiGrid.appendChild(emojiBtn);
    });
}

// 搜尋功能
searchInput.addEventListener('input', async () => {
    const query = searchInput.value.trim().toLowerCase();
    if (query.length > 0) {
        try {
            const response = await axios.get(`${BACKEND_URL}/api/friends`);
            const friends = response.data;
            const results = friends.filter(friend =>
                friend.name.toLowerCase().includes(query) ||
                friend.lastMessage?.toLowerCase().includes(query)
            );
            searchResults.style.display = 'block';
            searchResults.innerHTML = '';
            if (results.length > 0) {
                results.forEach(result => {
                    const resultItem = document.createElement('div');
                    resultItem.className = 'search-result-item';
                    let nameHtml = result.name;
                    let messageHtml = result.lastMessage || '';
                    if (result.name.toLowerCase().includes(query)) {
                        const regex = new RegExp(`(${query})`, 'gi');
                        nameHtml = result.name.replace(regex, '<span class="search-highlight">$1</span>');
                    }
                    if (result.lastMessage?.toLowerCase().includes(query)) {
                        const regex = new RegExp(`(${query})`, 'gi');
                        messageHtml = result.lastMessage.replace(regex, '<span class="search-highlight">$1</span>');
                    }
                    resultItem.innerHTML = `
                        <div class="flex items-center">
                            <div class="w-8 h-8 rounded-full bg-gradient-to-r ${result.avatar} flex items-center justify-center text-white font-bold">
                                ${result.name.charAt(0)}
                            </div>
                            <div class="ml-2">
                                <div class="font-medium">${nameHtml}</div>
                                <div class="text-xs text-gray-500">${messageHtml}</div>
                            </div>
                        </div>
                    `;
                    resultItem.addEventListener('click', async () => {
                        document.querySelectorAll('.friend-item').forEach(item => item.classList.remove('active'));
                        const friendItem = document.querySelector(`.friend-item[data-id="${result.id}"]`);
                        if (friendItem) friendItem.classList.add('active');
                        currentFriend = result;
                        activeFriendName.textContent = currentFriend.name;
                        activeFriendInitial.textContent = currentFriend.name.charAt(0);
                        callModalName.textContent = currentFriend.name;
                        callModalInitial.textContent = currentFriend.name.charAt(0);
                        await fetchMessages(currentFriend.id);
                        searchResults.style.display = 'none';
                        searchInput.value = '';
                    });
                    searchResults.appendChild(resultItem);
                });
            } else {
                searchResults.innerHTML = '<div class="p-2 text-gray-500">無搜尋結果</div>';
            }
        } catch (error) {
            console.error('搜尋失敗：', error);
        }
    } else {
        searchResults.style.display = 'none';
    }
});

// 事件監聽器
sendButton.addEventListener('click', sendMessage);
messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
});
emojiBtn.addEventListener('click', () => {
    emojiPicker.style.display = emojiPicker.style.display === 'block' ? 'none' : 'block';
});
attachBtn.addEventListener('click', () => fileInput.click());
modalClose.forEach(btn => btn.addEventListener('click', () => {
    imageModal.classList.remove('show');
    callModal.classList.remove('show');
    videoModal.classList.remove('show');
}));
callBtn.addEventListener('click', () => {
    callModal.classList.add('show');
    callStatus.textContent = `正在撥打電話給 ${currentFriend.name}...`;
});
videoBtn.addEventListener('click', () => videoModal.classList.add('show'));
endCallBtn.addEventListener('click', () => callModal.classList.remove('show'));
endVideoBtn.addEventListener('click', () => videoModal.classList.remove('show'));

// 初始化
currentUserInitial.textContent = currentUser.name.charAt(0);
renderEmojiPicker();
fetchFriends();
