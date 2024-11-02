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
