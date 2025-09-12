export const CURRENT_USER_KEY = 'groupOutsiderCurrentUser';

export function getCurrentUser() {
  try {
    const u = sessionStorage.getItem(CURRENT_USER_KEY);
    return (u && typeof u === 'string' && u.trim()) ? u.trim() : '_guest';
  } catch {
    return '_guest';
  }
}

export function setCurrentUser(username) {
  try {
    if (username && typeof username === 'string') {
      sessionStorage.setItem(CURRENT_USER_KEY, username);
    }
  } catch {}
}

// 生成带用户命名空间的键名，例如 nsKey('achievements') => groupOutsider:alice:achievements
export function nsKey(suffix) {
  const user = getCurrentUser();
  return `groupOutsider:${user}:${suffix}`;
}
