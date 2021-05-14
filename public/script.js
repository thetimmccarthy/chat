const socket = io();

const btn = document.getElementById('chat-form');
const words = document.querySelector('.enter-chat');


btn.addEventListener('submit', e => {
    e.preventDefault();
    
    
    socket.emit('chat', words.value);
    words.value = '';
})


const chatRoom = document.getElementById('chat-messages');

const renderMessage = (message, own) => {
    const span_class = own ? 'own' : 'other';
    const div_two_class = own ? 'inlineContainer own' : 'inlineContainer';
    const div_three_class = own ? 'ownBubble own' : 'otherBubble other';

    let date = new Date();
    let hours = date.getHours();
    let minutes = date.getMinutes();
    let seconds = date.getSeconds();
    let day = date.getDate();
    let month = date.getMonth() + 1;
    month = month < 10 ? '0' + month : month
    let year = date.getFullYear();
    minutes = minutes < 10 ? '0' + minutes : minutes; 
    let am_pm = hours < 12 ? "AM" : "PM";
    hours = hours <= 12 ? hours : hours - 12;
    
    
    const div = document.createElement('div');
    const div_two = document.createElement('div');
    const div_three = document.createElement('div');
    const time_span = document.createElement('span');
    
    div.className = 'bubbleWrapper';
    div_two.className = div_two_class;
    div_three.className = div_three_class;
    time_span.className = span_class;

    div_three.innerHTML = message;
    time_span.innerHTML = (month + '/' + day +'/' + year + " " + hours + ':' + minutes + " " + am_pm);
    
    div_two.appendChild(div_three);
    div.appendChild(div_two);
    div.appendChild(time_span);
    
    chatRoom.appendChild(div); 
    div.scrollIntoView();
}

socket.on('chat', (emails, message) => {       
    const own = emails.includes(socket.id);
    renderMessage(message, own);        
})

