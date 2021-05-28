const video = document.getElementById("video");
let predictedAges = [];

Promise.all([
  faceapi.nets.tinyFaceDetector.loadFromUri("/models"),
  faceapi.nets.faceLandmark68Net.loadFromUri("/models"),
  faceapi.nets.faceRecognitionNet.loadFromUri("/models"),
  faceapi.nets.faceExpressionNet.loadFromUri("/models"),
  faceapi.nets.ageGenderNet.loadFromUri("/models"),
  faceapi.nets.ssdMobilenetv1.loadFromUri("/models")
]).then(startVideo);

function startVideo() {
  navigator.getUserMedia(
    { video: {} },
    stream => (video.srcObject = stream),
    err => console.error(err)
  );
}

video.addEventListener("playing", async () => {
  const canvas = faceapi.createCanvasFromMedia(video);
  document.body.append(canvas);
  const displaySize = { width: video.width, height: video.height };
  faceapi.matchDimensions(canvas, displaySize);

  const labeledFaceDescriptors = await loadLabelledImages();
  const faceMatcher = new faceapi.FaceMatcher(labeledFaceDescriptors, 0.6)

  setInterval(async () => {
    const detections = await faceapi
      .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks()
      .withFaceExpressions()
      .withFaceDescriptors()
      .withAgeAndGender();
    const resizedDetections = faceapi.resizeResults(detections, displaySize);
    // console.log(resizedDetections)
    const results = resizedDetections.map(rd => faceMatcher.findBestMatch(rd.descriptor))

    // console.log(results)
    canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);

    faceapi.draw.drawDetections(canvas, resizedDetections);
    faceapi.draw.drawFaceLandmarks(canvas, resizedDetections);
    faceapi.draw.drawFaceExpressions(canvas, resizedDetections);

    const age = resizedDetections[0].age;
    const interpolatedAge = interpolateAgePredictions(age);
    const bottomRight = {
      x: resizedDetections[0].detection.box.bottomRight.x - 55,
      y: resizedDetections[0].detection.box.bottomRight.y
    };

    new faceapi.draw.DrawTextField(
      [`${faceapi.utils.round(interpolatedAge, 0)} years`],
      bottomRight
    ).draw(canvas);

    const topRight = {
      x: resizedDetections[0].detection.box.topRight.x - 45,
      y: resizedDetections[0].detection.box.topRight.y - 20
    };

    results.forEach(result => {
      new faceapi.draw.DrawTextField(
        [result.toString()],
        topRight
      ).draw(canvas);
      console.log(result)
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
  const labels = ['Deepak', 'Ghanshyam', 'Sushila', 'Krish', 'Sarthak'];

  return Promise.all(
    labels.map(async label => {
      const descriptions = []
      for (let index = 1; index <= 2; index++) {
        const image = await faceapi.fetchImage(`https://raw.githubusercontent.com/vieee/track-you/main/labelled_images/${label}/${index}.jpeg`);
        const detections = await faceapi
          .detectSingleFace(image)
          .withFaceLandmarks()
          .withFaceDescriptor();

        descriptions.push(detections.descriptor)
      }

      return new faceapi.LabeledFaceDescriptors(label, descriptions)
    })
  )
}
