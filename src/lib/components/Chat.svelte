<script>
    import OpenAI from 'openai';
    import { onMount } from 'svelte';
    import { vectorStoreService } from '../services/vectorStore';

    let messages = [];
    let newMessage = '';
    let openai;
    let assistant;
    let thread;
    let isInitializing = true;
    let initError = null;
    let isSending = false;

    function formatMessage(text) {
        if (!text) return '';

        // Remove file references like 【timestamp†filename】
        text = text.replace(/【[^】]*】/g, '');

        // Convert markdown links to clickable HTML links
        text = text.replace(/\[([^\]]*)\]\(([^)]*)\)/g, (match, text, url) => {
            return `<a href="${url}" target="_blank">${url}</a>`;
        });

        // Remove horizontal rules (---)
        text = text.replace(/^---$/gm, '<hr>');

        // Format headers
        text = text.replace(/^# (.*$)/gm, '<h1>$1</h1>');
        text = text.replace(/^## (.*$)/gm, '<h2>$1</h2>');
        text = text.replace(/^### (.*$)/gm, '<h3>$1</h3>');

        // Format bold text
        text = text.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');

        // Format italic text
        text = text.replace(/\*(.*?)\*/g, '<i>$1</i>');

        // Handle ordered lists
        let lines = text.split('\n');
        let inList = false;
        let listType = null;
        let formattedLines = [];

        for (let i = 0; i < lines.length; i++) {
            let line = lines[i].trim();
            
            // Skip empty lines between list items
            if (!line && inList && i + 1 < lines.length && 
                (lines[i + 1].trim().match(/^\d+\./) || lines[i + 1].trim().match(/^[-*]/))) {
                continue;
            }

            // Handle ordered lists
            if (line.match(/^\d+\./)) {
                if (!inList || listType !== 'ol') {
                    if (inList) formattedLines.push(`</${listType}>`);
                    formattedLines.push('<ol>');
                    inList = true;
                    listType = 'ol';
                }
                formattedLines.push(`<li>${line.replace(/^\d+\.\s*/, '')}</li>`);
                continue;
            }

            // Handle unordered lists
            if (line.match(/^[-*]/)) {
                if (!inList || listType !== 'ul') {
                    if (inList) formattedLines.push(`</${listType}>`);
                    formattedLines.push('<ul>');
                    inList = true;
                    listType = 'ul';
                }
                formattedLines.push(`<li>${line.replace(/^[-*]\s*/, '')}</li>`);
                continue;
            }

            // Close list if we're not in a list item anymore
            if (inList && line && !line.match(/^\d+\./) && !line.match(/^[-*]/)) {
                formattedLines.push(`</${listType}>`);
                inList = false;
                listType = null;
            }

            // Add non-list lines
            if (line) formattedLines.push(line);
        }

        // Close any open list
        if (inList) {
            formattedLines.push(`</${listType}>`);
        }

        // Join lines with appropriate spacing
        text = formattedLines.join('\n');

        // Convert remaining newlines to breaks, but limit consecutive breaks
        text = text.replace(/\n{3,}/g, '\n\n'); // Limit to max 2 consecutive newlines
        text = text.replace(/\n/g, '<br>');
        
        // Clean up excessive breaks around HTML elements
        text = text.replace(/(<\/(p|div|h\d|ul|ol|li)>)\s*<br>/g, '$1');
        text = text.replace(/<br>\s*(<(p|div|h\d|ul|ol|li)>)/g, '$1');
        text = text.replace(/(<hr>)\s*<br>/g, '$1');
        text = text.replace(/<br>\s*(<hr>)/g, '$1');
        
        // Remove breaks at start and end
        text = text.replace(/^(<br>)+|(<br>)+$/g, '');

        return text;
    }

    async function sendMessage() {
        if (!newMessage.trim() || !openai || isInitializing || initError || isSending) return;

        const currentDate = new Date().toISOString();

        const userMessage = {
            role: 'user',
            content: newMessage
        };

        messages = [...messages, userMessage];
        const currentMessage = newMessage;
        newMessage = '';
        isSending = true;

        try {
            // Add message to thread
            await openai.beta.threads.messages.create(thread.id, {
                role: 'user',
                content: currentMessage
            });

            // Create and run assistant
            const run = await openai.beta.threads.runs.create(thread.id, {
                assistant_id: assistant.id
            });

            // Poll for completion
            let runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
            while (runStatus.status !== 'completed') {
                await new Promise(resolve => setTimeout(resolve, 1000));
                runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
                
                if (runStatus.status === 'failed') {
                    throw new Error('Assistant run failed');
                }
            }

            // Get the assistant's response
            const responseMessages = await openai.beta.threads.messages.list(thread.id);
            const lastMessage = responseMessages.data[0];

            const assistantMessage = {
                role: 'assistant',
                content: lastMessage.content[0].text.value
            };

            messages = [...messages, assistantMessage];
        } catch (error) {
            console.error('Error sending message:', error);
            messages = [...messages, {
                role: 'assistant',
                content: 'Sorry, there was an error processing your request. Please try again.'
            }];
        } finally {
            isSending = false;
        }
    }

    function handleKeyPress(event) {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            sendMessage();
        }
    }

    onMount(async () => {
        const openaiId = localStorage.getItem('openaiId');
        if (!openaiId) {
            initError = 'OpenAI API key not found. Please add it in settings.';
            isInitializing = false;
            return;
        }

        try {
            openai = new OpenAI({
                apiKey: openaiId,
                dangerouslyAllowBrowser: true
            });

            // Check if vector store exists
            const vectorStoreId = localStorage.getItem('vectorStoreId');
            if (!vectorStoreId) {
                initError = 'Vector store not found. Please sync your data in settings first.';
                isInitializing = false;
                return;
            }

            // Get or create assistant
            const assistantId = localStorage.getItem('assistantId');
            if (assistantId) {
                assistant = await openai.beta.assistants.retrieve(assistantId);
            } else {
                assistant = await vectorStoreService.createAssistant();
            }

            // Create initial thread
            thread = await vectorStoreService.createThread();
            isInitializing = false;

            messages = [
                {
                    role: 'assistant',
                    content: 'How can I help you with your TwosApp data? I can search through your notes and provide relevant information.'
                }
            ];
        } catch (error) {
            console.error('Error initializing chat:', error);
            initError = error.message;
            isInitializing = false;
        }
    });
</script>

<div class="chat-container">
    <div class="messages">
        {#if initError}
            <div class="message error">
                <div class="message-content">
                    {initError}
                </div>
            </div>
        {/if}
        {#each messages as message}
            <div class="message {message.role}">
                <div class="message-content">
                    {@html formatMessage(message.content)}
                </div>
            </div>
        {/each}
        {#if isInitializing}
            <div class="message assistant">
                <div class="message-content">
                    Initializing chat...
                </div>
            </div>
        {/if}
        {#if isSending}
            <div class="message assistant">
                <div class="message-content">
                    <div class="spinner"></div>
                </div>
            </div>
        {/if}
        <!-- Add extra padding div -->
        <div class="bottom-padding"></div>
    </div>
    <div class="input-area">
        <textarea
            placeholder="Ask about your TwosApp data..."
            bind:value={newMessage}
            on:keydown={handleKeyPress}
            disabled={isInitializing || initError || isSending}></textarea>
        <button 
            on:click={sendMessage} 
            aria-label="Send message" 
            disabled={isInitializing || initError || isSending}>
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"></line>
                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
            </svg>
        </button>
    </div>
</div>

<style>
    .chat-container {
        display: flex;
        flex-direction: column;
        height: 100vh;
        background-color: #fff;
        max-width: 800px;
        margin: 0 auto;
        width: 100%;
        position: relative;
    }

    .messages {
        flex-grow: 1;
        overflow-y: auto;
        padding: 2rem;
        display: flex;
        flex-direction: column;
        gap: 1rem;
        margin-bottom: 80px; /* Height of input area plus padding */
    }

    /* Add bottom padding element styles */
    .bottom-padding {
        height: 2rem; /* Extra space at the bottom */
        flex-shrink: 0;
    }

    @media (max-width: 768px) {
        .messages {
            padding: 1rem;
        }
    }

    .message {
        max-width: 80%;
        padding: 0.5rem 1rem;
        border-radius: 1rem;
    }

    .message.user {
        align-self: flex-end;
        background-color: #007bff;
        color: white;
    }

    .message.assistant {
        align-self: flex-start;
        background-color: #f0f0f0;
        color: #333;
    }

    .message.error {
        align-self: center;
        background-color: #FFEBEE;
        color: #C62828;
        border: 1px solid #FFCDD2;
    }

    .message-content :global(h1),
    .message-content :global(h2),
    .message-content :global(h3) {
        margin: 1rem 0 0.5rem 0;
        font-weight: bold;
    }

    .message-content :global(h1) {
        font-size: 1.5em;
    }

    .message-content :global(h2) {
        font-size: 1.3em;
    }

    .message-content :global(h3) {
        font-size: 1.1em;
    }

    .message-content :global(ol), 
    .message-content :global(ul) {
        margin: 0.5rem 0;
        padding-left: 1.5rem;
    }

    .message-content :global(li) {
        margin: 0.25rem 0;
    }

    .message-content :global(b) {
        font-weight: bold;
    }

    .message-content :global(i) {
        font-style: italic;
    }

    .message-content :global(hr) {
        margin: 1rem 0;
        border: none;
        border-top: 1px solid #ddd;
    }

    .message-content :global(a) {
        color: #007bff;
        text-decoration: none;
    }

    .message-content :global(a:hover) {
        text-decoration: underline;
    }

    .spinner {
        width: 24px;
        height: 24px;
        border: 3px solid #f3f3f3;
        border-top: 3px solid #007bff;
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin: 0 auto;
    }

    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }

    .input-area {
        position: fixed;
        bottom: 0;
        left: 50%;
        transform: translateX(-50%);
        width: 100%;
        max-width: 800px;
        background-color: white;
        border-top: 1px solid #eee;
        padding: 1rem;
        display: flex;
        gap: 0.5rem;
        align-items: flex-end;
        box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.1);
    }

    textarea {
        flex-grow: 1;
        padding: 0.5rem;
        border: 1px solid #ddd;
        border-radius: 0.5rem;
        resize: none;
        min-height: 40px;
        max-height: 120px;
        font-family: inherit;
    }

    textarea:disabled {
        background-color: #f5f5f5;
        cursor: not-allowed;
    }

    button {
        background-color: #007bff;
        color: white;
        border: none;
        border-radius: 50%;
        width: 40px;
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        padding: 0.5rem;
    }

    button:hover:not(:disabled) {
        background-color: #0056b3;
    }

    button:disabled {
        background-color: #ccc;
        cursor: not-allowed;
    }

    svg {
        width: 20px;
        height: 20px;
    }
</style>
