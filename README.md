# TwosChat

TwosChat is a privacy-focused chat application built with Svelte that leverages OpenAI's vector database for intelligent conversations. All chat data is stored locally in your browser, ensuring your conversations remain private and secure.

## Features

- 💬 Real-time chat interface
- 🔒 Privacy-first approach with browser-only storage
- 🧠 Intelligent conversations powered by OpenAI
- 🔍 Context-aware responses using vector database
- ⚡ Fast and responsive Svelte-based UI

## Privacy & Data Storage

TwosChat takes your privacy seriously:
- No data is stored on any web servers
- All chat history is stored locally in your browser
- Vector embeddings are stored in OpenAI's vector database
- You maintain full control over your data

## Technologies Used

- [Svelte](https://svelte.dev/) - Frontend framework
- [OpenAI Assistants](https://platform.openai.com/assistants) - AI-powered conversations
- [OpenAI Vector Storage](https://platform.openai.com/storage/) - Semantic search and retrieval

## Getting Started

1. Clone the repository:
```bash
git clone https://github.com/yourusername/twoschat.git
cd twoschat
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser and navigate to `http://localhost:5173`

## Building for Production

To create a production build:
```bash
npm run build
```

## Configuration

1. Open the Settings panel in the application
2. Configure your OpenAI API key
3. Customize any additional settings as needed

## Browser Storage

TwosChat uses the following browser storage mechanisms:
- LocalStorage: For user preferences and settings
- IndexedDB: For chat history and conversation data

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.


# TwosChat User Manual

## What is TwosChat?

TwosChat is a smart chat application that helps you interact with your TwosApp data using AI. Think of it as your personal assistant that can search through and understand all your TwosApp notes and entries.

## Getting Started

### 1. Setting Up Your Account
To use TwosChat, you'll need three things:
- An OpenAI API token
- Your TwosApp User ID
- Your TwosApp Token

### 2. First-Time Setup
1. Click the settings button
2. Enter your OpenAI token (get it from [OpenAI's website](https://platform.openai.com/api-keys))
3. Enter your TwosApp User ID and Token (find instructions [here](https://www.TwosApp.com/6405a41296b108d1a68c713b))
4. Click "Save Settings"
5. Click "Sync to Vector Store" to load your TwosApp data

## How It Works

### Data Storage & Security
- Your data is stored securely in OpenAI's vector store
- The app uses your personal OpenAI API key, so your data remains private to your account
- No data is stored on public servers
- Your tokens and IDs are saved locally in your browser's storage
- Each time you sync, old data is automatically cleaned up and replaced with fresh data

### Chat Interface
- Type your questions or requests in the chat box
- Press Enter or click the send button to submit
- The AI will search through your TwosApp data and provide relevant information
- The AI can understand context and provide detailed responses based on your notes

### Data Syncing
- Use the "Sync to Vector Store" button in settings when you want to update your data
- Each sync refreshes all your data, ensuring you have the latest information
- The app will show you the sync status and any errors if they occur

## Tips for Best Results
1. **Be Specific**: Ask clear questions about your TwosApp data
2. **Regular Updates**: Sync your data periodically to ensure you have the latest information
3. **Check Settings**: If the chat isn't working, check if your tokens are correctly entered
4. **Error Messages**: If you see an error, try re-syncing your data or check your settings

## Privacy & Data Protection
- Your data is processed using your personal OpenAI API key
- Communications are encrypted using HTTPS
- Tokens and credentials are stored locally in your browser
- Data is refreshed with each sync, removing old versions
- No data is shared with third parties

## Troubleshooting

### Common Issues and Solutions

1. **Chat Not Working**
- Check if your OpenAI token is valid
- Ensure you've synced your data at least once
- Try refreshing the page

2. **Sync Failed**
- Verify your TwosApp credentials
- Check your internet connection
- Try syncing again after a few minutes

3. **Incorrect or Old Data**
- Click "Sync to Vector Store" to refresh your data
- Check if you're using the correct TwosApp account

### Need More Help?
If you encounter issues not covered in this manual, try:
1. Clearing your browser cache
2. Re-entering your credentials
3. Performing a fresh sync of your data
