
console.log("HPTracker service worker started");

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("received message.");
  console.log(message);
  getFanArt(message, sender, sendResponse);
  return true; //indicate that it will respond asynchronously
});


//Fetch fan art gallery from Critical Role website and return it to the content script
async function getFanArt(message, sender, sendResponse) {
  if(message["request"] == "GetFanArtGallery"){
    console.log("Get Fan Art Gallery");

    //get fan art gallery page from critrole website
    fetchResponse = await fetch("https://critrole.com/fan-art-gallery-" + message["galleryName"] + "/");
    console.log("fetch status: " + fetchResponse.status); 

    //TODO Error handling
    //TODO if doesn't work try without the 'fan-art-gallery-' part

    fetchResponseText = await fetchResponse.text();
    console.log(fetchResponseText);
    sendResponse({"text": fetchResponseText});

    console.log("response sent...");

  }



  else if (message["request"] == "GetWebPage"){
    console.log("Get Web Page");
    fetchResponse = await fetch(message["webpage"]);
    console.log("fetch status: " + fetchResponse.status); 

    fetchResponseText = await fetchResponse.text();
    console.log(fetchResponseText);
    sendResponse({"text": fetchResponseText});

    console.log("response sent...");
  }

}
