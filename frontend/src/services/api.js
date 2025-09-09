export async function pingBackend() {
  try {
    const response = await fetch("http://127.0.0.1:8000/ping");
    if (!response.ok) throw new Error("Backend not responding");
    return await response.json();
  } catch (err) {
    console.error(err);
    return { error: err.message };
  }
}
