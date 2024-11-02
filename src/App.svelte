<script>
  import Chat from './lib/components/Chat.svelte';
  import Settings from './lib/components/Settings.svelte';
  import { onMount } from 'svelte';

  let showSettings = false;
  let hasCredentials = false;

  onMount(() => {
    const openaiId = localStorage.getItem('openaiId');
    const twosUserId = localStorage.getItem('twosUserId');
    const twosToken = localStorage.getItem('twosToken');
    hasCredentials = Boolean(openaiId && twosUserId && twosToken);
    showSettings = !hasCredentials;
  });

  function handleSettingsClose() {
    showSettings = false;
  }
</script>

<main>
  <div class="app-container">
    {#if showSettings}
      <Settings on:close={handleSettingsClose} />
    {:else}
      <div class="chat-layout">
        <div class="content">
          <div class="header">
            <h1>TwosChat AI</h1>
            <button class="settings-button" on:click={() => showSettings = true} aria-label="Open Settings">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="3"></circle>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
              </svg>
            </button>
          </div>
          <Chat />
        </div>
      </div>
    {/if}
  </div>
</main>

<style>
  .app-container {
    height: 100vh;
    background-color: #f5f5f5;
    display: flex;
    justify-content: center;
  }

  .chat-layout {
    height: 100%;
    display: flex;
    flex-direction: column;
    width: 100%;
    max-width: 800px;
    margin: 0 auto;
  }

  .content {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .header {
    background-color: white;
    padding: 1rem 2rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid #eee;
    width: 100%;
  }

  h1 {
    font-size: 1.5rem;
    color: #333;
    margin: 0;
  }

  .settings-button {
    background: none;
    border: none;
    cursor: pointer;
    padding: 0.5rem;
    color: #666;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
  }

  .settings-button:hover {
    background-color: #f5f5f5;
  }

  :global(body) {
    margin: 0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen,
      Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
  }
</style>
