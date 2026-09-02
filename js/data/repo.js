/* The single place that decides where data lives.
   Views never touch a storage backend directly - they only use App.repo.

   The server injects window.STUDYTOOL_API into the page it serves, so:
     - opened from a file  -> no flag -> this browser's localStorage
     - served by server.py -> flag    -> the server, shared across your devices

   Nothing else in the app knows or cares which one is in use. */
window.App = window.App || {};

App.config = {
  storage: window.STUDYTOOL_API ? 'remote' : 'local',
  apiBaseUrl: window.STUDYTOOL_API || '/api'
};

App.repo = App.config.storage === 'remote'
  ? App.RemoteRepo.create({ baseUrl: App.config.apiBaseUrl })
  : App.LocalRepo.create();
