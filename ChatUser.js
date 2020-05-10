/** Functionality related to chatting. */

// Room is an abstraction of a chat channel
const Room = require('./Room');

/** ChatUser is a individual connection from client -> server to chat. */

class ChatUser {
  /** make chat: store connection-device, rooom */

  constructor(send, roomName) {
    this._send = send; // "send" function for this user
    this.room = Room.get(roomName); // room user will be in
    this.name = null; // becomes the username of the visitor

    console.log(`created chat in ${this.room.name}`);
  }

  /** send msgs to this client using underlying connection-send-function */
  send(data) {
    try {
      this._send(data);
    } catch {
      // If trying to send to a user fails, ignore it
    }
  }

  /** handle joining: add to room members, announce join */

  handleJoin(name) {
    this.name = name;
    this.room.join(this);
    this.room.broadcast({
      type: 'note',
      text: `${this.name} joined "${this.room.name}".`
    });
  }

  /** handle a chat: broadcast to room. */

  handleChat(text) {
    this.room.broadcast({
      name: this.name,
      type: 'chat',
      text: text
    });
  }
  
  /** handle a joke: select joke and send back to only the user who requested it */
  handleJoke() {
    
    const jokes = ["Where does a king keep his armies? In his sleevies", "What is brown and sticky? A stick"];
  
    const randIdx = Math.floor(Math.random() * 2);
  
    const data = this.createDataObj(this.name, 'joke', jokes[randIdx]);
    this.send(JSON.stringify(data));
  }

  createDataObj(name, type, text){
    return {name, type , text};
  }

  handleMembers(){
  
    const memberNames = Array.from(this.room.members).map(member => member.name);
  
    const data = this.createDataObj(this.name, 'members', `In room: ${memberNames}`);
    this.send(JSON.stringify(data));
  }

  handlePrivateMessage(text) {
    const textArray = text.split(" ");
    
    const recipient = Array.from(this.room.members).find(member => member.name === textArray[1]);
    if (!recipient) {
      throw new Error('User not in chat room');
    }

    textArray.splice(0, 2);
  
    const data = this.createDataObj(this.name, 'chat', textArray.join(" "));
    recipient.send(JSON.stringify(data));
  }
  
  /** Handle messages from client:
   *
   * - {type: "join", name: username} : join
   * - {type: "chat", text: msg }     : chat
   */

  handleMessage(jsonData) {
    let msg = JSON.parse(jsonData);
    if (msg.type === 'join') this.handleJoin(msg.name);
    else if (msg.type === 'chat') this.handleChat(msg.text);
    else if (msg.type === 'joke') this.handleJoke();
    else if (msg.type === 'members') this.handleMembers();
    else if (msg.type === 'priv') this.handlePrivateMessage(msg.text);
    else throw new Error(`bad message: ${msg.type}`);
  }

  /** Connection was closed: leave room, announce exit to others */

  handleClose() {
    this.room.leave(this);
    this.room.broadcast({
      type: 'note',
      text: `${this.name} left ${this.room.name}.`
    });
  }
}

module.exports = ChatUser;
