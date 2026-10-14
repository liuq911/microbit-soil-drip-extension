SoilDripControl.startExperiment()
SoilDripControl.enableSensorButton()

basic.forever(function () {
    if (SoilDripControl.sensorValue() > 200) {
        SoilDripControl.oneDropAndSpread()
    } else if (SoilDripControl.sensorValue() < 100) {
        // 太濕：不滴水，等待蒸發
    } else {
        // 100~200：達標，等待蒸發後再檢查
    }

    basic.pause(2000)
})
