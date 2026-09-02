/* Boot: the route table, then start the router. */
window.App = window.App || {};

App.router.define([
  { pattern: /^\/$/,                          view: App.views.home },
  { pattern: /^\/topics$/,                    view: App.views.topicEditor },
  { pattern: /^\/general$/,                   view: App.views.general },
  { pattern: /^\/general\/session$/,          view: App.views.sessionForm },
  { pattern: /^\/exams$/,                     view: App.views.examList },
  { pattern: /^\/exams\/new$/,                view: App.views.examForm },
  { pattern: /^\/exams\/([^/]+)\/edit$/,      view: App.views.examForm,    keys: ['examId'] },
  { pattern: /^\/exams\/([^/]+)\/session$/,   view: App.views.sessionForm, keys: ['examId'] },
  { pattern: /^\/exams\/([^/]+)$/,            view: App.views.examDetail,  keys: ['examId'] }
]);

App.router.start(document.getElementById('app'));
