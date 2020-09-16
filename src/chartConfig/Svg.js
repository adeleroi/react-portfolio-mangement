import React, { useEffect, useRef, useState, Component } from 'react'
import { select, line, area, axisBottom, timeParse, axisLeft, axisRight, scaleLinear, scaleUtc, extent, max, min, selectAll, timer, timeFormat } from 'd3';
// import * as d3 from 'd3'
import * as d3  from 'd3-fetch'


class Svg extends Component {
    constructor(props){
        super(props);
        this.state = {
            dataX: [],
            dataY: [],
            infos: {},
            period: "5Y",
            symbol: "amzn",
            Token :"pk_99d153747d5a4c939661c8f2fb359437",
            baseUrl : "https://cloud.iexapis.com/stable",
            sandbaseUrl : "https://sandbox.iexapis.com/stable",
            sandToken : "Tsk_f449b3b9b1e04ea3b0e1e41c195a4359",
        }
        this.svgRef = React.createRef();
    };

    movingAverage(values, N){
        let i = 0; 
        let sum = 0;
        const means = new Float64Array(values.length).fill(NaN);
        for (let n = Math.min(N - 1, values.length); i < n; ++i) {
            sum += values[i];
        }
        for (let n = values.length; i < n; ++i) {
            sum += values[i];
            means[i] = sum / N;
            sum  -= values[i - N + 1];
        }
        return means;
    };

    drawChart(symbol, period){
        const loadHistorycalPrices =  d3.json(`${this.state.sandbaseUrl}/stock/${symbol}/chart/${period}?token=${this.state.sandToken}`)
        // get and parse the data
        loadHistorycalPrices.then(val => {
            const date = period === "1D" ? val.map(el => el.minute) : val.map(el => el.date);
            // const parseTime = timeFormat("%H:%M");
            console.log(val.length);
            const valeur = val.map(el => el.close);
            this.setState({dataX: [...date]});
            this.setState({dataY:[...valeur]});
            const liste = []
            // const parseTime = timeFormat("%H:%M")
            liste.push(date.map((val, index)=> ({date: new Date(val), value: valeur[index]})))
            const data = liste[0]
            console.log(data[1])
            console.log(typeof(data[1].value))
            const height = 300;
            const width = 764;

            // console.log(this.movingAverage(valeur, 5))
            const movingAverageData = []
            const movingListe = this.movingAverage(valeur, 5);
            movingAverageData.push(date.map((val, index) => ({date: new Date(val), value: movingListe[index]})));
            console.log("movingAverage ", movingAverageData[0])
            console.log("data ", data)

        // Remove previous svg element
            selectAll("svg > *").remove(); // select all element below the svg then remove them
            
        /*******Drawing the new chart*****/
            const svg = select(this.svgRef.current)
                .attr("viewBox", [0, 0, width, height]);
            
            //chart config
            const margin = ({top: 20, right:30, bottom: 30, left: 40});
            const yTitle = "$ Close";
        
            // set the domain (set of all the value we want to display) and the range(range for displaying those value)
            const x = scaleUtc().domain(extent(data, (d) => d.date)).range([margin.left, width - margin.right]);
            const y = scaleLinear().domain([min(data, (d) => d.value), max(data, (d) => d.value)]).nice().range([height - margin.bottom, margin.top]);      
            
            // define moving average
            const MovingAverage = line()
                .defined(d => !isNaN(d.value))
                .x(d => x(d.date))
                .y(d => y(d.value))

            // define the line
            const Line = line()
                .defined(d => !isNaN(d.value))
                .x(d => x(d.date))
                .y(d => y(d.value))
            
            // define area   css .area{ fill: lightsteelblue };
            const Area = area()
                .defined(d => !isNaN(d.value))
                .x(d => x(d.date))
                .y0(height-margin.bottom) // bottom of the graph
                .y1(d => y(d.value))// y1 top of the graph

            // create the defs element onto which we can append a linearGrandient
            const areaGradient = svg.append("defs")
                .append("linearGradient")
                .attr("id", "areaGradient")
                .attr("x1", "0%").attr("y1", "0%")
                .attr("x2", "0%").attr("y2", "100%");

            areaGradient.append("stop")
                .attr("offset", "60%")
                .attr("stop-color", "#b0c4de")
                .attr("stop-opacity", 0.3);
            areaGradient.append("stop")
                .attr("offset", "100%")
                .attr("stop-color", "#d9e4f2")
                .attr("stop-opacity", 0);
            
            //set the x axis
            const xAxis = g => g
                    .attr("transform", `translate(0,${height - margin.bottom})`)
                    .style("stroke-dasharray", ("3", "3"))
                    .style("stroke-opacity", "0.1")
                    .call(axisBottom(x).ticks(5).tickSizeOuter(12).tickSize(-height)); // ticks(width/80)
            
            //set the y axis
            const yAxis = g => g
                .attr("transform", "translate(735,0)")
                .call(axisRight(y))
                .call(g => g.select(".domain").remove())
                .call(axisRight(y).ticks(5).tickSizeOuter(5).tickSize(-width))
                .style("stroke-opacity", "0.1")
                .style("stroke-dasharray", ("3", "3"))
                .call(g => g.select(".tick:last-of-type text").clone()
                    .attr("x", 3)
                    .attr("text-anchor", "start")
                    .attr("font", "10px cabin"))
                    // .attr("text-decoration", "underline"));
            
            //add the x axis
            svg.append("g")
                .call(xAxis)
                .style("font-size", "6px");

            //add the y axis
            svg.append("g")
                .call(yAxis)
                .style("font-size", "6px")

            //add the area
            svg.append("path")
                .datum(data)
                // .attr("fill",)
                .attr("class", "area")
                .style("fill", "url(#areaGradient)")
                .attr("d", Area)

            //add the line
            svg.append("path")
                .datum(data)
                .attr("fill", "none")
                .attr("stroke", "steelblue")
                .attr("stroke-width", 1)
                .attr("stroke-linejoin", "round")
                .attr("stroke-linecap", "round")
                .attr("d", Line )
            //add the moving average
            svg.append("path")
                .datum(movingAverageData[0])
                .attr("fill", "none")
                .attr("stroke", "red")
                .attr("stroke-width", 1)
                .attr("stroke-linejoin", "round")
                .attr("stroke-linecap", "round")
                // .style("stroke", "red")
                .attr("d", MovingAverage)


        } )
    }
    componentDidMount(){
        console.log(this.state.sandToken)
        console.log(this.props)
        this.drawChart(this.props.symbol.toLowerCase(), this.props.period);
        
    }
    componentDidUpdate(prevProps, pervState){
        if(prevProps.period != this.props.period) {
            console.log("willll")
            this.drawChart(this.props.symbol.toLowerCase(), this.props.period)
        }
    }
    
    render(){
        return (
            <div className="chart-container">
                <svg ref={this.svgRef}></svg>
            </div>
        )
    }
}


export default Svg;