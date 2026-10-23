import { createContext, useContext } from 'react';

/**
 * True inside AppShell's phone navigation drawer (HAR-1371). The sidebar there is shown full,
 * whatever tier a person chose on a wide screen: a Sidebar and an AccountMenu read this and drop
 * their rail form. Internal: not exported from the package.
 */
export const ShellDrawerContext = createContext(false);

export const useInShellDrawer = (): boolean => useContext(ShellDrawerContext);
