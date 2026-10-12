//% color="#3C9D4E" weight=90 icon="\uf043" block="土壤滴灌"
namespace SoilDrip {
    let DRY_VALUE = 800
    let WET_VALUE = 30
    let DROP_AMOUNT = 90
    let SPREAD_PERCENT = 72

    let soil: number[] = []
    let nextSoil: number[] = []

    let sensorDistance = 0
    let sensorX = 2
    let sensorY = 2

    let started = false
    let startTime = 0

    function ensureInit() {
        if (soil.length == 25) return

        soil = []
        nextSoil = []

        for (let i = 0; i <= 24; i++) {
            soil.push(0)
            nextSoil.push(0)
        }

        sensorDistance = 0
        sensorX = 2
        sensorY = 2
        started = false
        startTime = 0
    }

    function setSensorPositionInternal() {
        if (sensorDistance == 0) {
            sensorX = 2
            sensorY = 2
        } else if (sensorDistance == 1) {
            sensorX = 3
            sensorY = 2
        } else if (sensorDistance == 2) {
            sensorX = 4
            sensorY = 2
        } else if (sensorDistance == 3) {
            sensorX = 4
            sensorY = 3
        } else {
            sensorX = 4
            sensorY = 4
        }
    }

    function moistureToBrightness(moisture: number): number {
        if (moisture <= 0) return 0
        let brightness = 35 + Math.round(moisture * 220 / 255)
        if (brightness > 255) brightness = 255
        return brightness
    }

    function moistureToSensorValue(moisture: number): number {
        let value = DRY_VALUE - Math.round(
            moisture * (DRY_VALUE - WET_VALUE) / 255
        )
        if (value < WET_VALUE) value = WET_VALUE
        if (value > DRY_VALUE) value = DRY_VALUE
        return value
    }

    function drawSoilInternal() {
        ensureInit()

        for (let y = 0; y <= 4; y++) {
            for (let x = 0; x <= 4; x++) {
                let index = y * 5 + x
                let moisture = soil[index]

                if (moisture > 0) {
                    led.plotBrightness(
                        x,
                        y,
                        moistureToBrightness(moisture)
                    )
                } else {
                    led.unplot(x, y)
                }
            }
        }
    }

    function diffuseOnceInternal() {
        ensureInit()

        for (let i = 0; i <= 24; i++) {
            nextSoil[i] = soil[i]
        }

        for (let y = 0; y <= 4; y++) {
            for (let x = 0; x <= 4; x++) {
                let index = y * 5 + x
                let source = soil[index]

                if (source > 0) {
                    let spreadValue = Math.round(
                        source * SPREAD_PERCENT / 100
                    )

                    if (x > 0 && spreadValue > nextSoil[index - 1]) {
                        nextSoil[index - 1] = spreadValue
                    }
                    if (x < 4 && spreadValue > nextSoil[index + 1]) {
                        nextSoil[index + 1] = spreadValue
                    }
                    if (y > 0 && spreadValue > nextSoil[index - 5]) {
                        nextSoil[index - 5] = spreadValue
                    }
                    if (y < 4 && spreadValue > nextSoil[index + 5]) {
                        nextSoil[index + 5] = spreadValue
                    }
                }
            }
        }

        for (let i = 0; i <= 24; i++) {
            soil[i] = nextSoil[i]
            if (soil[i] > 255) soil[i] = 255
        }

        drawSoilInternal()
    }

    //% blockId=soil_drip_set_sensor_distance
    //% block="設定感測器距離 %distance"
    //% distance.min=0 distance.max=4 distance.defl=0
    //% weight=100
    export function setSensorDistance(distance: number): void {
        ensureInit()
        sensorDistance = Math.constrain(distance, 0, 4)
        setSensorPositionInternal()

        drawSoilInternal()
        led.plotBrightness(sensorX, sensorY, 255)
        basic.pause(150)
        drawSoilInternal()
    }

    //% blockId=soil_drip_drop_and_diffuse
    //% block="中央滴水 %drops 次並擴散一次"
    //% drops.min=1 drops.max=5 drops.defl=1
    //% weight=90
    export function dropAndDiffuse(drops: number): void {
        ensureInit()

        if (!started) {
            started = true
            startTime = control.millis()
        }

        drops = Math.constrain(drops, 1, 5)

        let center = 12

        for (let i = 0; i < drops; i++) {
            soil[center] += DROP_AMOUNT
            if (soil[center] > 255) {
                soil[center] = 255
            }
        }

        diffuseOnceInternal()
    }

    //% blockId=soil_drip_sensor_value
    //% block="感測器數值"
    //% weight=80
    export function sensorValue(): number {
        ensureInit()
        let index = sensorY * 5 + sensorX
        return moistureToSensorValue(soil[index])
    }

    //% blockId=soil_drip_show_soil
    //% block="顯示土壤濕度"
    //% weight=70
    export function showSoil(): void {
        drawSoilInternal()
    }

    //% blockId=soil_drip_elapsed_seconds
    //% block="經過時間（秒）"
    //% weight=60
    export function elapsedSeconds(): number {
        if (!started) return 0
        return Math.round((control.millis() - startTime) / 100) / 10
    }

    //% blockId=soil_drip_is_saturated
    //% block="感測器已飽和"
    //% weight=50
    export function isSaturated(): boolean {
        return sensorValue() <= WET_VALUE
    }

    //% blockId=soil_drip_reset
    //% block="重設土壤實驗"
    //% weight=40
    export function reset(): void {
        soil = []
        nextSoil = []
        ensureInit()
        basic.clearScreen()
    }
}
