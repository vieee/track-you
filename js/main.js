const video = document.getElementById("video");
let predictedAges = [];
let loginStatus;
const ssID = "GOOGLE_SPREAD_SHEET_ID";
const attendance = {
  Deepak: "4",
  Ghanshyam: "5",
  Sarthak: "6",
  Krish: "7",
};

Promise.all([
  faceapi.nets.tinyFaceDetector.loadFromUri(
    "https://raw.githubusercontent.com/vieee/track-you/main/models"
  ),
  faceapi.nets.faceLandmark68Net.loadFromUri(
    "https://raw.githubusercontent.com/vieee/track-you/main/models"
  ),
  faceapi.nets.faceRecognitionNet.loadFromUri(
    "https://raw.githubusercontent.com/vieee/track-you/main/models"
  ),
  faceapi.nets.faceExpressionNet.loadFromUri(
    "https://raw.githubusercontent.com/vieee/track-you/main/models"
  ),
  faceapi.nets.ageGenderNet.loadFromUri(
    "https://raw.githubusercontent.com/vieee/track-you/main/models"
  ),
  faceapi.nets.ssdMobilenetv1.loadFromUri(
    "https://raw.githubusercontent.com/vieee/track-you/main/models"
  ),
]).then(startVideo);

function startVideo() {
  navigator.getUserMedia(
    { video: {} },
    (stream) => (video.srcObject = stream),
    (err) => console.error(err)
  );
}

video.addEventListener("playing", async () => {
  const canvas = faceapi.createCanvasFromMedia(video);
  document.body.append(canvas);
  const displaySize = { width: video.width, height: video.height };
  faceapi.matchDimensions(canvas, displaySize);

  const labeledFaceDescriptors = await loadLabelledImages();
  const faceMatcher = new faceapi.FaceMatcher(labeledFaceDescriptors, 0.6);

  setInterval(async () => {
    const detections = await faceapi
      .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks()
      .withFaceExpressions()
      .withFaceDescriptors()
      .withAgeAndGender();
    const resizedDetections = faceapi.resizeResults(detections, displaySize);
    // console.log(resizedDetections)
    const results = resizedDetections.map((rd) =>
      faceMatcher.findBestMatch(rd.descriptor)
    );

    // console.log(results)
    canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);

    faceapi.draw.drawDetections(canvas, resizedDetections);
    faceapi.draw.drawFaceLandmarks(canvas, resizedDetections);
    faceapi.draw.drawFaceExpressions(canvas, resizedDetections);

    const age = resizedDetections[0].age;
    const interpolatedAge = interpolateAgePredictions(age);
    const bottomRight = {
      x: resizedDetections[0].detection.box.bottomRight.x - 55,
      y: resizedDetections[0].detection.box.bottomRight.y,
    };

    new faceapi.draw.DrawTextField(
      [`${faceapi.utils.round(interpolatedAge, 0)} years`],
      bottomRight
    ).draw(canvas);

    const topRight = {
      x: resizedDetections[0].detection.box.topRight.x - 45,
      y: resizedDetections[0].detection.box.topRight.y - 20,
    };

    results.forEach((result) => {
      new faceapi.draw.DrawTextField([result._label], topRight).draw(canvas);
      // console.log(result);
      updateDataFromSheet(result._label);
    });
  }, 100);
});

function interpolateAgePredictions(age) {
  predictedAges = [age].concat(predictedAges).slice(0, 30);
  const avgPredictedAge =
    predictedAges.reduce((total, a) => total + a) / predictedAges.length;
  return avgPredictedAge;
}

function loadLabelledImages() {
  const labels = ["Deepak", "Ghanshyam", "Sushila", "Krish", "Sarthak"];

  return Promise.all(
    labels.map(async (label) => {
      const descriptions = [];
      for (let index = 1; index <= 2; index++) {
        const image = await faceapi.fetchImage(
          `https://raw.githubusercontent.com/vieee/track-you/main/labelled_images/${label}/${index}.jpeg`
        );
        const detections = await faceapi
          .detectSingleFace(image)
          .withFaceLandmarks()
          .withFaceDescriptor();

        descriptions.push(detections.descriptor);
      }

      return new faceapi.LabeledFaceDescriptors(label, descriptions);
    })
  );
}

function handleClientLoad() {
  gapi.load("client:auth2", initClient);
}

function initClient() {
  var API_KEY = "MY_GOOGLE_API_KEY"; // TODO: Update placeholder with desired API key.

  var CLIENT_ID =
    "MY_GOOGLE_CLIENT_ID"; // TODO: Update placeholder with desired client ID.

  // TODO: Authorize using one of the following scopes:
  //   'https://www.googleapis.com/auth/drive'
  //   'https://www.googleapis.com/auth/drive.file'
  //   'https://www.googleapis.com/auth/drive.readonly'
  //   'https://www.googleapis.com/auth/spreadsheets'
  //   'https://www.googleapis.com/auth/spreadsheets.readonly'
  var SCOPE = "https://www.googleapis.com/auth/spreadsheets";

  gapi.client
    .init({
      apiKey: API_KEY,
      clientId: CLIENT_ID,
      scope: SCOPE,
      discoveryDocs: [
        "https://sheets.googleapis.com/$discovery/rest?version=v4",
      ],
    })
    .then(function () {
      gapi.auth2.getAuthInstance().isSignedIn.listen(updateSignInStatus);
      updateSignInStatus(gapi.auth2.getAuthInstance().isSignedIn.get());
    });
}

function updateSignInStatus(isSignedIn) {
  if (isSignedIn) {
    console.log("Logged In");
  } else {
    gapi.auth2.getAuthInstance().signIn();
  }
}

function updateDataFromSheet(name) {
  var params = {
    // The ID of the spreadsheet to update.
    spreadsheetId: ssID, // TODO: Update placeholder value.

    // The A1 notation of the values to update.
    range: "D" + attendance[name], // TODO: Update placeholder value.

    // How the input data should be interpreted.
    valueInputOption: "RAW", // TODO: Update placeholder value.
  };

  var valueRangeBody = {
    values: [["P"]],
  };

  var request = gapi.client.sheets.spreadsheets.values.update(
    params,
    valueRangeBody
  );
  request.then(
    function (response) {
      // TODO: Change code below to process the `response` object:
      // console.log(response.result);
      JSalert();
    },
    function (reason) {
      console.error("error: " + reason.result.error.message);
    }
  );
}

function JSalert() {
  swal("Congrats!", ", Your attendance is marked!", "success");
}
