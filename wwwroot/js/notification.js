//https://docs.microsoft.com/en-us/aspnet/core/tutorials/signalr?view=aspnetcore-3.0&tabs=visual-studio
//i know, i know. global variables are the devil. but that's how this entire codebase is set up...
var connection = new signalR.HubConnectionBuilder()
  .withUrl(`${apiBaseUrl}notificationhub`)
  .build();

connection.on("New Notification", (data) => {
  notifications = data;
  $("#header__notification__count").text(notifications.length)
  setTimeout(() => {
    notificationCountHandler(notifications, currentUser.type)
  }, 500);
})

connection.start()
  .then( () => {
    console.log('connection live...');
})
  .catch( err  => {
    console.log('nonono', err);
})
