
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  getFanArt(message, sender, sendResponse);
  return true; //indicate that it will respond asynchronously
});


//Fetch fan art gallery from Critical Role website and return it to the content script
async function getFanArt(message, sender, sendResponse) {
  if(message["request"] == "GetFanArtGallery"){
    //sendResponse("test response");

    //get fan art gallery page from critrole website
    fetchResponse = await fetch("https://critrole.com/fan-art-gallery-" + message["galleryName"] + "/")
    console.log("fetch status: " + fetchResponse.status); 

    //TODO if doesn't work try without the 'fan-art-gallery-' part

    fetchResponseText = await fetchResponse.text();
    console.log(fetchResponseText);
    sendResponse(fetchResponseText);

    console.log("response sent...");

  }

}