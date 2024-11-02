import OpenAI from 'openai';
import { writable } from 'svelte/store';

export const vectorSyncStatus = writable('idle');

class VectorStoreService {
    constructor() {
        this.openai = null;
        this.vectorStoreId = null;
        this.initialize();
    }

    initialize() {
        const openaiId = localStorage.getItem('openaiId');
        if (openaiId) {
            this.openai = new OpenAI({
                apiKey: openaiId,
                dangerouslyAllowBrowser: true
            });
            this.vectorStoreId = localStorage.getItem('vectorStoreId');
        }
    }

    async cleanupExistingResources() {
        if (!this.openai) {
            throw new Error('OpenAI client not initialized');
        }

        try {
            console.log('Starting cleanup of existing resources...');

            // Delete existing assistant if any
            const existingAssistantId = localStorage.getItem('assistantId');
            if (existingAssistantId) {
                console.log('Deleting existing assistant:', existingAssistantId);
                try {
                    await this.openai.beta.assistants.del(existingAssistantId);
                    localStorage.removeItem('assistantId');
                } catch (error) {
                    console.warn('Error deleting assistant:', error);
                }
            }

            // Delete existing vector store if any
            const existingVectorStoreId = localStorage.getItem('vectorStoreId');
            if (existingVectorStoreId) {
                console.log('Deleting existing vector store:', existingVectorStoreId);
                try {
                    await this.openai.beta.vectorStores.del(existingVectorStoreId);
                    localStorage.removeItem('vectorStoreId');
                    this.vectorStoreId = null;
                } catch (error) {
                    console.warn('Error deleting vector store:', error);
                }
            }

            console.log('Cleanup completed');
        } catch (error) {
            console.error('Error during cleanup:', error);
            // Continue with the process even if cleanup fails
        }
    }

    async fetchTwosData(userId, token) {
        console.log('Fetching data from Twos API...');
        const response = await fetch('https://www.twosapp.com/apiV2/user/export', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                user_id: userId,
                token: token,
                page: 0
            })
        });

        if (!response.ok) {
            throw new Error('Failed to fetch data from Twos');
        }

        const data = await response.json();
        console.log('Data received:', {
            entriesCount: data.entries?.length || 0,
            postsCount: data.posts?.length || 0
        });
        return data;
    }

    formatDataForVectorStore(data) {
        if (!data.entries || data.entries.length === 0) {
            throw new Error('No entries found in Twos data');
        }

        // Format entries with their associated posts
        const formattedEntries = data.entries.map(entry => {
            const entryPosts = data.posts.filter(post => post.entry_id === entry._id);
            return {
                title: entry.title,
                _id: entry._id,
                lastModified: entry.lastModified,
                posts: entryPosts.map(post => ({
                    text: post.text,
                    _id: post._id,
                    type: post.type,
                    lastModified: post.lastModified,
                    url: post.url || "",
                    tags: post.tags || []
                }))
            };
        });

        // Split into chunks for better processing
        const chunks = [];
        const CHUNK_SIZE = 50;
        
        for (let i = 0; i < formattedEntries.length; i += CHUNK_SIZE) {
            const chunk = formattedEntries.slice(i, i + CHUNK_SIZE);
            chunks.push({
                entries: chunk.map(entry => ({
                    ...entry,
                    // Create a combined content field for better semantic search
                    content: `${entry.title}\n${entry.posts.map(post => 
                        `${post.text} ${post.tags?.join(' ') || ''}`
                    ).join('\n')}`
                }))
            });
        }

        console.log('Formatted chunks:', chunks.length);
        return chunks;
    }

    async uploadFiles(chunks) {
        const fileIds = [];
        for (const [index, chunk] of chunks.entries()) {
            console.log(`Uploading file ${index + 1}/${chunks.length}`);
            const file = new File(
                [JSON.stringify(chunk)],
                `twos_data_${index}.json`,
                { type: 'application/json' }
            );

            const uploadedFile = await this.openai.files.create({
                file,
                purpose: 'assistants'
            });

            fileIds.push(uploadedFile.id);
            console.log(`File ${index + 1} uploaded with ID: ${uploadedFile.id}`);
        }
        return fileIds;
    }

    async syncToVectorStore(userId, token) {
        if (!this.openai) {
            throw new Error('OpenAI client not initialized');
        }

        if (!userId || !token) {
            throw new Error('Twos User ID and Token are required');
        }

        try {
            vectorSyncStatus.set('syncing');

            // Clean up existing resources first
            await this.cleanupExistingResources();

            // Fetch data from Twos
            const twosData = await this.fetchTwosData(userId, token);
            
            // Format the data
            const chunks = this.formatDataForVectorStore(twosData);
            
            if (chunks.length === 0) {
                throw new Error('No data available to sync');
            }

            // Upload files first
            console.log('Uploading files...');
            const fileIds = await this.uploadFiles(chunks);

            // Create vector store
            console.log('Creating vector store...');
            const vectorStore = await this.openai.beta.vectorStores.create({
                name: "Twoschat store"
            });

            this.vectorStoreId = vectorStore.id;
            localStorage.setItem('vectorStoreId', vectorStore.id);
            console.log('Vector store created:', vectorStore.id);

            // Create file batch with file IDs
            console.log('Creating file batch...');
            await this.openai.beta.vectorStores.fileBatches.create(
                vectorStore.id,
                {
                    file_ids: fileIds
                }
            );

            // Create new assistant with updated vector store
            console.log('Creating assistant...');
            const assistant = await this.createAssistant();
            console.log('Assistant created:', assistant.id);
            
            vectorSyncStatus.set('success');
            return {
                success: true,
                vectorStoreId: vectorStore.id,
                assistantId: assistant.id,
                chunksProcessed: chunks.length,
                fileIds
            };
        } catch (error) {
            console.error('Error syncing to vector store:', error);
            vectorSyncStatus.set('error');
            throw error;
        }
    }

    async createAssistant() {
        if (!this.openai) {
            throw new Error('OpenAI client not initialized');
        }

        if (!this.vectorStoreId) {
            throw new Error('Vector store ID not found. Please sync data first.');
        }

        try {
            const assistant = await this.openai.beta.assistants.create({
                instructions: `You are a helpful assistant that provides information based on the user's TwosApp data. 
Use the vector store to search through their notes and provide relevant information.
When answering questions, try to:
    1. Search for relevant content in the vector store
    2. Provide specific examples from the user's notes when applicable
    3. Include relevant dates and context from the stored data
    4. Quote specific parts of notes when they directly answer the user's question
    5. ALWAYS RETURN MARKDOWN
    6. don't add file references in the response
    `,
                model: "gpt-4o",
                tools: [{"type": "file_search"}],
                name: "Twosapp Chat ",
                tool_resources: {
                    "file_search": {
                        "vector_store_ids": [this.vectorStoreId]
                    }
                }
            });

            localStorage.setItem('assistantId', assistant.id);
            return assistant;
        } catch (error) {
            console.error('Error creating assistant:', error);
            throw error;
        }
    }

    async createThread(initialMessage) {
        if (!this.openai || !this.vectorStoreId) {
            throw new Error('OpenAI client or vector store ID not initialized');
        }

        try {
            const thread = await this.openai.beta.threads.create({
                messages: [
                    { 
                        role: "user", 
                        content: initialMessage || "Hello" 
                    }
                ],
                tool_resources: {
                    "file_search": {
                        "vector_store_ids": [this.vectorStoreId]
                    }
                }
            });

            return thread;
        } catch (error) {
            console.error('Error creating thread:', error);
            throw error;
        }
    }
}

export const vectorStoreService = new VectorStoreService();
