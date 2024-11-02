/// <reference types="svelte" />

declare namespace svelteHTML {
    interface HTMLAttributes<T> {
        'on:click'?: (event: CustomEvent<any>) => void;
        'on:close'?: (event: CustomEvent<any>) => void;
    }
}
