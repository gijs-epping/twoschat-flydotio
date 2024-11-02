<script>
    import { onMount } from 'svelte';
    import { dbService, tasksStore } from '../services/database.js';

    let selectedTaskId = null;
    let searchQuery = '';

    function selectTask(id) {
        selectedTaskId = selectedTaskId === id ? null : id;
    }

    async function searchTasks() {
        await dbService.searchTasks(searchQuery);
    }

    // Load all tasks initially
    onMount(async () => {
        await dbService.getAllTasks();
    });

    // Update tasks when search query changes
    $: {
        if (searchQuery !== undefined) {
            searchTasks();
        }
    }

    // Format date for display
    function formatDate(dateStr) {
        if (!dateStr) return '';
        try {
            const date = new Date(dateStr);
            return date.toLocaleDateString();
        } catch (e) {
            return dateStr;
        }
    }

    // Get first non-header post text for preview
    function getPreviewText(posts) {
        if (!posts || posts.length === 0) return '';
        const nonHeaderPost = posts.find(post => !post.header && !post.subHeader && post.text.trim());
        return nonHeaderPost ? nonHeaderPost.text : '';
    }

    // Filter out header posts for display
    function getDisplayPosts(posts) {
        if (!posts) return [];
        return posts.filter(post => !post.header && !post.subHeader);
    }

    // Get post style classes
    function getPostClasses(post) {
        return {
            'post-item': true,
            'indented': post.tabs > 0,
            'bold': post.bold,
            'italic': post.italic,
            'underline': post.underline,
            'completed': post.completed,
            'canceled': post.canceled,
            'checkbox': post.type === 'checkbox',
            'dash': post.type === 'dash'
        };
    }
</script>

<div class="context-panel">
    <h2>Search Context</h2>
    <div class="search-box">
        <input 
            type="text" 
            bind:value={searchQuery} 
            placeholder="Search tasks..."
            aria-label="Search tasks"
        />
    </div>
    <div class="task-list">
        {#each $tasksStore as entry}
            <div class="entry-container">
                <button 
                    class="entry-item" 
                    class:selected={selectedTaskId === entry._id}
                    on:click={() => selectTask(entry._id)}
                    aria-pressed={selectedTaskId === entry._id}
                >
                    <div class="entry-header">
                        <div class="entry-title">{entry.title}</div>
                        <div class="entry-date">{formatDate(entry.lastModified)}</div>
                    </div>
                    {#if entry.posts && entry.posts.length > 0}
                        <div class="entry-preview">{getPreviewText(entry.posts)}</div>
                    {/if}
                </button>

                {#if selectedTaskId === entry._id && entry.posts}
                    <div class="entry-details">
                        {#each getDisplayPosts(entry.posts) as post}
                            <div class={Object.entries(getPostClasses(post))
                                .filter(([_, value]) => value)
                                .map(([key]) => key)
                                .join(' ')}>
                                {#if post.type === 'checkbox'}
                                    <input 
                                        type="checkbox" 
                                        disabled 
                                        checked={post.completed}
                                        aria-label="Task completion status"
                                    >
                                {/if}
                                <span>{post.text}</span>
                            </div>
                        {/each}
                    </div>
                {/if}
            </div>
        {/each}
        {#if $tasksStore.length === 0}
            <div class="no-tasks">
                No tasks found. Try syncing your Twos data in Settings.
            </div>
        {/if}
    </div>
</div>

<style>
    .context-panel {
        background: white;
        border-left: 1px solid #eee;
        padding: 1rem;
        width: 300px;
        height: 100%;
        display: flex;
        flex-direction: column;
    }

    h2 {
        font-size: 1.2rem;
        margin-bottom: 1rem;
        color: #333;
    }

    .search-box {
        margin-bottom: 1rem;
    }

    .search-box input {
        width: 100%;
        padding: 0.5rem;
        border: 1px solid #ddd;
        border-radius: 4px;
        font-size: 0.9rem;
    }

    .task-list {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        overflow-y: auto;
        flex: 1;
    }

    .entry-container {
        border-radius: 4px;
        overflow: hidden;
    }

    .entry-item {
        display: flex;
        flex-direction: column;
        padding: 0.75rem;
        width: 100%;
        text-align: left;
        border: none;
        background: none;
        cursor: pointer;
        transition: background-color 0.2s;
    }

    .entry-item:hover {
        background-color: #f5f5f5;
    }

    .entry-item.selected {
        background-color: #f0f0f0;
    }

    .entry-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 0.5rem;
    }

    .entry-title {
        font-size: 1rem;
        color: #333;
        font-weight: 500;
        flex: 1;
    }

    .entry-date {
        font-size: 0.75rem;
        color: #888;
        white-space: nowrap;
    }

    .entry-preview {
        font-size: 0.85rem;
        color: #666;
        margin-top: 0.25rem;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .entry-details {
        padding: 0.5rem 0.75rem;
        background-color: #f8f8f8;
        border-top: 1px solid #eee;
    }

    .post-item {
        padding: 0.25rem 0;
        display: flex;
        align-items: flex-start;
        gap: 0.5rem;
        font-size: 0.9rem;
        color: #444;
    }

    .indented {
        margin-left: 1.5rem;
    }

    .bold {
        font-weight: 600;
    }

    .italic {
        font-style: italic;
    }

    .underline {
        text-decoration: underline;
    }

    .completed {
        color: #888;
        text-decoration: line-through;
    }

    .canceled {
        color: #999;
        text-decoration: line-through;
    }

    .checkbox {
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }

    .dash {
        position: relative;
        padding-left: 1rem;
    }

    .dash::before {
        content: "•";
        position: absolute;
        left: 0;
    }

    .no-tasks {
        text-align: center;
        color: #666;
        padding: 1rem;
        font-size: 0.9rem;
    }

    /* Scrollbar styling */
    .task-list::-webkit-scrollbar {
        width: 6px;
    }

    .task-list::-webkit-scrollbar-track {
        background: #f1f1f1;
    }

    .task-list::-webkit-scrollbar-thumb {
        background: #888;
        border-radius: 3px;
    }

    .task-list::-webkit-scrollbar-thumb:hover {
        background: #555;
    }
</style>
