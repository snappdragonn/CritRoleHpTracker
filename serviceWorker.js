
//Fetch fan art images from Critical Role fan art gallery and return them to the content script
chrome.runtime.onMessage.addListener(
  function(message, sender, sendResponse) {
    if(message == "GetFanArt"){
      //sendResponse("test response");

      fetch("https://critrole.com/fan-art-gallery-from-zwei-to-nein/")
        .then((response) => {
          console.log(response.ok); 
          response.text().then((text) => console.log(text));

          response = {"status": response.status, "statusText": response.statusText};
          console.log(response);
          console.log(Date.now());
          sendResponse(response);
      });

    console.log("response sent...")

    return true; //indicate that it will respond asynchronously

    }

  }
);