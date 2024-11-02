<script>
    import { createEventDispatcher } from 'svelte';
    import { vectorStoreService, vectorSyncStatus } from '../services/vectorStore.js';

    const dispatch = createEventDispatcher();
    
    let openaiId = '';
    let twosUserId = '';
    let twosToken = '';
    let assistantInstructions = '';
    let vectorSyncResult = null;
    let isSaving = false;
    let isVectorSyncing = false;
    let errorDetails = '';

    const defaultInstructions = `You are a specialized assistant analyzing TwosApp data from vector-stored JSON. Find and present relevant information with source links.

GUIDELINES:
1. Search for exact matches first, then semantic matches
2. Include dates and context from stored data
3. Quote relevant text with links to source
4. Group related information together

FORMAT:
- Use Markdown formatting
- Quote format: > "Text" - [View](https://www.twosapp.com/{_id})
- Create links using: [Context](https://www.twosapp.com/{_id})
- Include dates when available
- List related items with bullets`;


    async function syncToVectorStore() {
        try {
            isVectorSyncing = true;
            vectorSyncResult = null;
            errorDetails = '';
            const result = await vectorStoreService.syncToVectorStore(twosUserId, twosToken);
            vectorSyncResult = result;
            if (result.success) {
                console.log('Vector sync successful:', result);
            } else {
                console.error('Vector sync failed:', result.error);
                errorDetails = result.error;
            }
        } catch (error) {
            console.error('Vector sync error:', error);
            vectorSyncResult = { success: false, error: error.message };
            errorDetails = error.message;
        } finally {
            isVectorSyncing = false;
        }
    }

    function saveSettings() {
        isSaving = true;
        try {
            localStorage.setItem('openaiId', openaiId);
            localStorage.setItem('twosUserId', twosUserId);
            localStorage.setItem('twosToken', twosToken);
            localStorage.setItem('assistantInstructions', assistantInstructions);
            vectorSyncResult = null;
            errorDetails = '';
            // Reinitialize vector store service with new API key
            vectorStoreService.initialize();
        } finally {
            isSaving = false;
        }
    }

    function closeSettings() {
        dispatch('close');
    }

    // Load settings on mount
    $: {
        if (typeof window !== 'undefined') {
            openaiId = localStorage.getItem('openaiId') || '';
            twosUserId = localStorage.getItem('twosUserId') || '';
            twosToken = localStorage.getItem('twosToken') || '';
            assistantInstructions = localStorage.getItem('assistantInstructions') || defaultInstructions;
        }
    }
</script>

<div class="settings">
    <div class="settings-header">
        <h2>Settings</h2>
        <button class="close-button" on:click={closeSettings}>×</button>
    </div>
    
    <div class="form-group">
        <label for="openai-id">OpenAi token: <a  target="_blank" href="https://platform.openai.com/api-keys">generate token</a></label>
        
        <input 
            type="text" 
            id="openai-id" 
            bind:value={openaiId} 
            placeholder="Enter your OpenAI ID"
        />
    </div>

    <div class="form-group">
        <label for="twos-user-id"><strong>Twos User ID</strong></label>
        <input 
            type="text" 
            id="twos-user-id" 
            bind:value={twosUserId} 
            placeholder="Enter your Twos User ID"
        />
    </div>
    <div class="form-group">
        <label for="twos-token"><strong>Twos Token</strong></label>
        <input 
            type="password" 
            id="twos-token" 
            bind:value={twosToken} 
            placeholder="Enter your Twos Token"
        />
    </div>
    <div class="form-group">
        <label for="openai-id">More info on how to get the Twos ID and Token:</label>
        <a target="_blank" href="https://www.TwosApp.com/6405a41296b108d1a68c713b">Using the twosapp today api</a>
    </div>
    <div class="form-group">
        <label for="assistant-instructions"><strong>Assistant Instructions</strong></label>
        <textarea 
            id="assistant-instructions" 
            bind:value={assistantInstructions} 
            rows="8"
            placeholder="Enter instructions for the AI assistant"
        ></textarea>
    </div>
    <div class="button-group">
        <button 
            class="save-button" 
            on:click={saveSettings} 
            disabled={isSaving || isVectorSyncing}
        >
            {isSaving ? 'Saving...' : 'Save Settings'}
        </button>
        <button 
            class="vector-sync-button" 
            on:click={syncToVectorStore} 
            disabled={isSaving || isVectorSyncing || !openaiId || !twosUserId || !twosToken}
        >
            {isVectorSyncing ? 'Syncing to Vector Store...' : 'Sync to Vector Store'}
        </button>
    </div>
    
    {#if vectorSyncResult}
        <div class="sync-status" class:success={vectorSyncResult.success} class:error={!vectorSyncResult.success}>
            {#if vectorSyncResult.success}
                Successfully synced {vectorSyncResult.chunksProcessed} chunks to vector store
            {:else}
                Error syncing to vector store: {vectorSyncResult.error}
            {/if}
        </div>
    {/if}

    {#if errorDetails}
        <div class="error-details">
            <h3>Error Details:</h3>
            <pre>{errorDetails}</pre>
        </div>
    {/if}

    {#if $vectorSyncStatus === 'syncing'}
        <div class="sync-progress">
            Syncing to vector store...
        </div>
    {/if}
</div>

<style>
    .settings {
        padding: 2rem;
        max-width: 500px;
        margin: 0 auto;
        position: relative;
    }

    .settings-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1.5rem;
    }

    .close-button {
        background: none;
        border: none;
        font-size: 1.5rem;
        cursor: pointer;
        padding: 0.5rem;
        line-height: 1;
        color: #666;
        min-width: auto;
        transition: color 0.2s;
    }

    .close-button:hover {
        color: #333;
    }

    .form-group {
        margin-bottom: 1rem;
    }

    label {
        display: block;
        margin-bottom: 0.5rem;
        color: #666;
    }

    input, textarea {
        width: 100%;
        padding: 0.5rem;
        border: 1px solid #ddd;
        border-radius: 4px;
        font-size: 1rem;
        font-family: inherit;
    }

    textarea {
        resize: vertical;
        min-height: 100px;
    }

    input:focus, textarea:focus {
        border-color: #007bff;
        outline: none;
        box-shadow: 0 0 0 2px rgba(0,123,255,0.25);
    }

    .button-group {
        display: flex;
        gap: 1rem;
        margin-top: 1.5rem;
        flex-wrap: wrap;
    }

    button {
        padding: 0.5rem 1rem;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 1rem;
        flex: 1;
        min-width: 200px;
        transition: background-color 0.2s, opacity 0.2s;
    }

    button:disabled {
        opacity: 0.7;
        cursor: not-allowed;
    }

    .save-button {
        background-color: #4CAF50;
        color: white;
    }

    .save-button:hover:not(:disabled) {
        background-color: #45a049;
    }

    .vector-sync-button {
        background-color: #9C27B0;
        color: white;
    }

    .vector-sync-button:hover:not(:disabled) {
        background-color: #7B1FA2;
    }

    .sync-status {
        margin-top: 1rem;
        padding: 1rem;
        border-radius: 4px;
        text-align: center;
        animation: fadeIn 0.3s ease-in-out;
    }

    .sync-status.success {
        background-color: #E8F5E9;
        color: #2E7D32;
        border: 1px solid #A5D6A7;
    }

    .sync-status.error {
        background-color: #FFEBEE;
        color: #C62828;
        border: 1px solid #FFCDD2;
    }

    .error-details {
        margin-top: 1rem;
        padding: 1rem;
        background-color: #FFEBEE;
        border: 1px solid #FFCDD2;
        border-radius: 4px;
    }

    .error-details h3 {
        color: #C62828;
        margin: 0 0 0.5rem 0;
    }

    .error-details pre {
        margin: 0;
        white-space: pre-wrap;
        word-break: break-all;
    }

    .sync-progress {
        margin-top: 1rem;
        text-align: center;
        color: #666;
        animation: pulse 1.5s infinite;
    }

    @keyframes fadeIn {
        from {
            opacity: 0;
            transform: translateY(-10px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }

    @keyframes pulse {
        0% {
            opacity: 0.6;
        }
        50% {
            opacity: 1;
        }
        100% {
            opacity: 0.6;
        }
    }
</style>
