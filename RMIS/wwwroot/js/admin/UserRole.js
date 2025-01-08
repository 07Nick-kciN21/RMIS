export function getCookie(name) {
    const cookies = document.cookie.split(';');
    console.log(cookies);
    for (let cookie of cookies) {
      const [key, value] = cookie.trim().split('=');
      if (key === name) {
        return decodeURIComponent(value);
      }
    }
    return null;
  }