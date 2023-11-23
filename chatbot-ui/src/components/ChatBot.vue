<template>
    <div class="chatbot-selection">
        <div>
            <h3>Choose ChatBot Option</h3>
        </div>
        <label>
            <input type="radio" v-model="selectedOption" value="1" />
                Dummy ChatBot
        </label>
        <label>
            <input type="radio" v-model="selectedOption" value="2" />
                OpenAI ChatBot
        </label>
        <label>
            <input type="radio" v-model="selectedOption" value="3" />
                Embedded ChatBot
        </label>
    </div>
    <div class="chatbot-container">
        <div class="chatbot-messages" ref="messagesContainer">
            <div v-for="(message, index) in messages" :key="index" class="message" :class="{ 'user-message': message.type === 'user', 'bot-message': message.type === 'bot' }">
                {{ message.text }}
            </div>
            <div v-if="isLoading" class="loader">Loading...</div>
        </div>
        <div class="chatbot-input">
            <input v-model="userInput" @keyup.enter="sendMessage" placeholder="Type your message..." />
            <button @click="sendMessage">Send</button>
            <input type="file" ref="fileInput" @change="handleFileChange" />
            <button @click="uploadPdf">Upload PDF</button>
        </div>
    </div>
</template>
  
<script>
import axios from 'axios';

export default {
data() {
    return {
    userInput: '',
    selectedOption: 1,
    selectedFile: null,
    result: null,
    messages: [],
    isLoading: false,
    };
},
methods: {
    handleFileChange(event) {
      this.selectedFile = event.target.files[0];
    },
    async uploadPdf() {
        if (this.selectedFile==undefined) return;
        this.userInput = '';
        this.isLoading = true;
      try {
        const formData = new FormData();
        formData.append('pdfFile', this.selectedFile);

        const response = await axios.post('http://localhost:3000/pdf', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
        const botResponse = { text: `Bot: ${response.data.bot}`, type: 'bot' };
        this.messages.push(botResponse);
        this.scrollToBottom();
      } catch (error) {
        console.error('Error uploading PDF:', error);
      } finally {
            this.isLoading = false;
        }
    },
    async sendMessage() {
        const userMessage = { text: this.userInput, type: 'user' };
        this.messages.push(userMessage);
        this.scrollToBottom();
        if (this.userInput==="") {
            const botMessage = { text: "Enter something to start with!", type: 'bot' };
            this.messages.push(botMessage);
            this.scrollToBottom();
        }
        else if (this.selectedOption == '1')
            await this.dummyChatBot(this.userInput);
        else if (this.selectedOption == '2')
            await this.openAIChatBot(this.userInput);
        else if (this.selectedOption == '3')
            await this.openAIEmbeddedChatBot(this.userInput);
    },
    async dummyChatBot(userInput) {
        this.userInput = '';
        this.isLoading = true;
        try {
            const response = await axios.post(
                'http://localhost:3000/dummy/chatbot',
            {
                inputString: userInput,
            });
            const botResponse = { text: `Bot: ${response.data.bot}`, type: 'bot' };
            this.messages.push(botResponse);
            this.scrollToBottom();
        } catch (error) {
            console.error('Error sending text to OpenAI:', error);
        } finally {
            this.isLoading = false;
        }
    },
    async openAIChatBot(userInput) {
        this.userInput = '';
        this.isLoading = true;
        try {
            const response = await axios.post(
                'http://localhost:3000/openai/chatbot',
            {
                inputString: userInput,
            });
            const botResponse = { text: `Bot: ${response.data.bot}`, type: 'bot' };
            this.messages.push(botResponse);
            this.scrollToBottom();
        } catch (error) {
            console.error('Error sending text to OpenAI:', error);
        } finally {
            this.isLoading = false;
        }
    },
    async openAIEmbeddedChatBot(userInput) {
        this.userInput = '';
        this.isLoading = true;
        try {
            const response = await axios.post(
                'http://localhost:3000/openai/chatbot/embedded',
            {
                inputString: userInput,
            });
            const botResponse = { text: `Bot: ${response.data.bot}`, type: 'bot' };
            this.messages.push(botResponse);
            this.scrollToBottom();
        } catch (error) {
            console.error('Error sending text to OpenAI:', error);
        } finally {
            this.isLoading = false;
        }
    },
    scrollToBottom() {
        const messagesContainer = this.$refs.messagesContainer;
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    },
},
};
</script>

<style scoped>
.chatbot-selection{
    margin-bottom: 10px;
}

.chatbot-container {
    margin-left: auto;
    margin-right: auto;
    width: 600px;
    border: 1px solid #ccc;
    border-radius: 8px;
    overflow: hidden;
}

.chatbot-messages {
    min-height: 300px;
    max-height: 300px;
    overflow-y: auto;
    padding: 10px;
}

.message {
    margin-bottom: 10px;
    padding: 8px;
    border-radius: 5px;
}

.user-message {
    background-color: #eee;
}

.bot-message {
    background-color: #c3e88d;
}

.chatbot-input {
    display: flex;
    justify-content: space-between;
    padding: 10px;
    border-top: 1px solid #ccc;
}

input {
    flex: 1;
    padding: 5px;
    margin-right: 5px;
    border: 1px solid #ccc;
    border-radius: 5px;
}

button {
    padding: 5px 10px;
    border: 1px solid #ccc;
    border-radius: 5px;
    cursor: pointer;
    margin-right: 5px;
}
</style>
