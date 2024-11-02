import { writable } from 'svelte/store';

// Create stores for sync status and data
export const syncStatus = writable('idle');
export const tasksStore = writable([]);

// Initialize localStorage if needed
if (typeof window !== 'undefined') {
    if (!localStorage.getItem('openaiId')) localStorage.setItem('openaiId', '');
    if (!localStorage.getItem('twosUserId')) localStorage.setItem('twosUserId', '');
    if (!localStorage.getItem('twosToken')) localStorage.setItem('twosToken', '');
}

class DatabaseService {
    constructor() {
        this.dbName = 'twosDB';
        this.entryStoreName = 'entries';
        this.postStoreName = 'posts';
        this.dbVersion = 4; // Increment version to force upgrade
        console.log('DatabaseService initialized');
        this.initDatabase();
    }

    async initDatabase() {
        console.log('Initializing database...');
        return new Promise((resolve, reject) => {
            // Delete existing database first
            const deleteRequest = indexedDB.deleteDatabase(this.dbName);
            console.log('Deleting existing database...');

            deleteRequest.onsuccess = () => {
                console.log('Existing database deleted successfully');
                // After deletion, open new database
                const request = indexedDB.open(this.dbName, this.dbVersion);
                console.log('Opening new database...');

                request.onerror = () => {
                    console.error('Database error:', request.error);
                    reject(request.error);
                };

                request.onsuccess = () => {
                    console.log('Database opened successfully');
                    resolve(request.result);
                };

                request.onupgradeneeded = (event) => {
                    console.log('Database upgrade needed, creating stores...');
                    const db = request.result;
                    
                    // Create entries (lists) store
                    if (!db.objectStoreNames.contains(this.entryStoreName)) {
                        console.log('Creating entries store...');
                        const entryStore = db.createObjectStore(this.entryStoreName, { keyPath: '_id' });
                        entryStore.createIndex('title', 'title', { unique: false });
                        entryStore.createIndex('lastModified', 'lastModified', { unique: false });
                    }

                    // Create posts (list items) store
                    if (!db.objectStoreNames.contains(this.postStoreName)) {
                        console.log('Creating posts store...');
                        const postStore = db.createObjectStore(this.postStoreName, { keyPath: '_id' });
                        postStore.createIndex('entry_id', 'entry_id', { unique: false });
                        postStore.createIndex('text', 'text', { unique: false });
                        postStore.createIndex('lastModified', 'lastModified', { unique: false });
                        postStore.createIndex('type', 'type', { unique: false });
                    }
                    console.log('Stores created successfully');
                };
            };

            deleteRequest.onerror = () => {
                console.error('Error deleting database:', deleteRequest.error);
                // If deletion fails, try opening anyway
                const request = indexedDB.open(this.dbName, this.dbVersion);
                request.onerror = () => reject(request.error);
                request.onsuccess = () => resolve(request.result);
            };
        });
    }

    async syncData(userId, token) {
        try {
            console.log('Starting sync with userId:', userId);
            syncStatus.set('syncing');
            
            // Add current date to the request body
            
            
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
                console.error('API response not OK:', response.status, response.statusText);
                throw new Error('Failed to fetch data from Twos');
            }

            const data = await response.json();
            console.log('Data received:', {
                entriesCount: data.entries?.length || 0,
                postsCount: data.posts?.length || 0
            });

            const db = await this.initDatabase();
            if (!db) {
                console.error('Database not initialized');
                throw new Error('Database not initialized');
            }

            return new Promise((resolve, reject) => {
                console.log('Starting database transaction...');
                const transaction = db.transaction([this.entryStoreName, this.postStoreName], 'readwrite');
                const entryStore = transaction.objectStore(this.entryStoreName);
                const postStore = transaction.objectStore(this.postStoreName);

                transaction.onerror = (event) => {
                    console.error('Transaction error:', event);
                    reject(new Error('Transaction failed'));
                };

                console.log('Clearing existing data...');
                const clearEntries = entryStore.clear();
                clearEntries.onsuccess = () => {
                    console.log('Entries cleared successfully');
                    const clearPosts = postStore.clear();
                    clearPosts.onsuccess = () => {
                        console.log('Posts cleared successfully');
                        // Store entries
                        const entries = data.entries || [];
                        let entriesAdded = 0;
                        console.log('Adding entries:', entries.length);

                        if (entries.length === 0) {
                            console.log('No entries to add, completing transaction');
                            transaction.oncomplete = async () => {
                                console.log('Transaction completed');
                                await this.getAllTasks();
                                syncStatus.set('success');
                                resolve({
                                    success: true,
                                    count: { entries: 0, posts: 0 }
                                });
                            };
                            return;
                        }

                        entries.forEach((entry, index) => {
                            const addEntryRequest = entryStore.add(entry);
                            addEntryRequest.onsuccess = () => {
                                entriesAdded++;
                                console.log(`Entry ${index + 1}/${entries.length} added`);
                                if (entriesAdded === entries.length) {
                                    // After all entries are added, store posts
                                    const posts = data.posts || [];
                                    let postsAdded = 0;
                                    console.log('Adding posts:', posts.length);

                                    if (posts.length === 0) {
                                        console.log('No posts to add, completing transaction');
                                        transaction.oncomplete = async () => {
                                            console.log('Transaction completed');
                                            await this.getAllTasks();
                                            syncStatus.set('success');
                                            resolve({
                                                success: true,
                                                count: { entries: entries.length, posts: 0 }
                                            });
                                        };
                                        return;
                                    }

                                    posts.forEach((post, index) => {
                                        const addPostRequest = postStore.add(post);
                                        addPostRequest.onsuccess = () => {
                                            postsAdded++;
                                            console.log(`Post ${index + 1}/${posts.length} added`);
                                            if (postsAdded === posts.length) {
                                                console.log('All data stored successfully');
                                                transaction.oncomplete = async () => {
                                                    console.log('Transaction completed');
                                                    await this.getAllTasks();
                                                    syncStatus.set('success');
                                                    resolve({
                                                        success: true,
                                                        count: {
                                                            entries: entries.length,
                                                            posts: posts.length
                                                        }
                                                    });
                                                };
                                            }
                                        };
                                        addPostRequest.onerror = (event) => {
                                            console.error('Error adding post:', event);
                                            reject(new Error('Failed to add post'));
                                        };
                                    });
                                }
                            };
                            addEntryRequest.onerror = (event) => {
                                console.error('Error adding entry:', event);
                                reject(new Error('Failed to add entry'));
                            };
                        });
                    };
                    clearPosts.onerror = (event) => {
                        console.error('Error clearing posts:', event);
                        reject(new Error('Failed to clear posts'));
                    };
                };
                clearEntries.onerror = (event) => {
                    console.error('Error clearing entries:', event);
                    reject(new Error('Failed to clear entries'));
                };
            });
        } catch (error) {
            console.error('Sync error:', error);
            syncStatus.set('error');
            return { success: false, error: error.message };
        }
    }

    async searchTasks(query) {
        console.log('Searching tasks with query:', query);
        if (!query.trim()) {
            return this.getAllTasks();
        }

        const db = await this.initDatabase();
        if (!db) throw new Error('Database not initialized');

        return new Promise((resolve) => {
            console.log('Starting search transaction...');
            const transaction = db.transaction([this.entryStoreName, this.postStoreName], 'readonly');
            const entryStore = transaction.objectStore(this.entryStoreName);
            const postStore = transaction.objectStore(this.postStoreName);

            const entries = [];
            const posts = [];

            const entryCursor = entryStore.openCursor();
            entryCursor.onsuccess = (event) => {
                const cursor = entryCursor.result;
                if (cursor) {
                    entries.push(cursor.value);
                    cursor.continue();
                } else {
                    console.log('Collected entries:', entries.length);
                    // After collecting all entries, get posts
                    const postCursor = postStore.openCursor();
                    postCursor.onsuccess = (event) => {
                        const cursor = postCursor.result;
                        if (cursor) {
                            posts.push(cursor.value);
                            cursor.continue();
                        } else {
                            console.log('Collected posts:', posts.length);
                            // Process search results
                            const searchResults = entries
                                .filter(entry => 
                                    entry.title.toLowerCase().includes(query.toLowerCase())
                                )
                                .map(entry => ({
                                    ...entry,
                                    posts: posts.filter(post => 
                                        post.entry_id === entry._id &&
                                        (post.text.toLowerCase().includes(query.toLowerCase()) ||
                                         entry.title.toLowerCase().includes(query.toLowerCase()))
                                    )
                                }))
                                .filter(entry => entry.posts.length > 0);

                            console.log('Search results:', searchResults.length);
                            tasksStore.set(searchResults);
                            resolve(searchResults);
                        }
                    };
                }
            };
        });
    }

    async getAllTasks() {
        console.log('Getting all tasks...');
        const db = await this.initDatabase();
        if (!db) throw new Error('Database not initialized');

        return new Promise((resolve) => {
            console.log('Starting getAllTasks transaction...');
            const transaction = db.transaction([this.entryStoreName, this.postStoreName], 'readonly');
            const entryStore = transaction.objectStore(this.entryStoreName);
            const postStore = transaction.objectStore(this.postStoreName);

            const entries = [];
            const posts = [];

            const entryCursor = entryStore.openCursor();
            entryCursor.onsuccess = (event) => {
                const cursor = entryCursor.result;
                if (cursor) {
                    entries.push(cursor.value);
                    cursor.continue();
                } else {
                    console.log('Collected all entries:', entries.length);
                    // After collecting all entries, get posts
                    const postCursor = postStore.openCursor();
                    postCursor.onsuccess = (event) => {
                        const cursor = postCursor.result;
                        if (cursor) {
                            posts.push(cursor.value);
                            cursor.continue();
                        } else {
                            console.log('Collected all posts:', posts.length);
                            // Combine entries with their posts
                            const tasksWithPosts = entries.map(entry => ({
                                ...entry,
                                posts: posts.filter(post => post.entry_id === entry._id)
                            }));

                            console.log('Combined tasks with posts:', tasksWithPosts.length);
                            tasksStore.set(tasksWithPosts);
                            resolve(tasksWithPosts);
                        }
                    };
                }
            };
        });
    }

    async getTaskById(id) {
        console.log('Getting task by id:', id);
        const db = await this.initDatabase();
        if (!db) throw new Error('Database not initialized');

        return new Promise((resolve) => {
            const transaction = db.transaction([this.entryStoreName, this.postStoreName], 'readonly');
            const entryStore = transaction.objectStore(this.entryStoreName);
            const postStore = transaction.objectStore(this.postStoreName);

            const request = entryStore.get(id);
            request.onsuccess = () => {
                const entry = request.result;
                if (!entry) {
                    console.log('No entry found for id:', id);
                    resolve(null);
                    return;
                }

                const postsRequest = postStore.index('entry_id').getAll(id);
                postsRequest.onsuccess = () => {
                    const result = {
                        ...entry,
                        posts: postsRequest.result
                    };
                    console.log('Found task with posts:', result);
                    resolve(result);
                };
            };
        });
    }
}

// Create and export a singleton instance
export const dbService = new DatabaseService();
