SoilDrip.setSensorDistance(3)

input.onButtonPressed(Button.B, function () {
    SoilDrip.dropAndDiffuse(1)

    serial.writeString("感測值=")
    serial.writeNumber(SoilDrip.sensorValue())

    serial.writeString("  時間=")
    serial.writeNumber(SoilDrip.elapsedSeconds())

    serial.writeLine(" 秒")
})
