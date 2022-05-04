//Desarrollo de las visualizaciones
import * as d3 from 'd3';
import { numberWithCommas3 } from '../helpers';
import { getInTooltip, getOutTooltip, positionTooltip } from '../modules/tooltip';
import { setChartHeight } from '../modules/height';
import { setChartCanvas, setChartCanvasImage } from '../modules/canvas-image';
import { setRRSSLinks } from '../modules/rrss';
import { setFixedIframeUrl } from './chart_helpers';

//Colores fijos
const COLOR_PRIMARY_1 = '#F8B05C',
COLOR_COMP_1 = '#528FAD';
let tooltip = d3.select('#tooltip');

export function initChart() {
    //Lectura de datos
    d3.csv('https://raw.githubusercontent.com/CarlosMunozDiazCSIC/informe_perfil_mayores_2022_salud_2_4/main/data/edv_buena_salud_65.csv', function(error,data) {
        if (error) throw error;

        //Gráfico sencillo de barras apiladas
        let currentType = 'Porcentajes';

        let margin = {top: 12.5, right: 10, bottom: 25, left: 25},
            width = document.getElementById('chart').clientWidth - margin.left - margin.right,
            height = document.getElementById('chart').clientHeight - margin.top - margin.bottom;

        let svg = d3.select("#chart")
            .append("svg")
                .attr("width", width + margin.left + margin.right)
                .attr("height", height + margin.top + margin.bottom)
            .append("g")
                .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

        let anios = d3.map(data, function(d){return(d.periodo)}).keys();
        let tiposPorcentajes = ['hombres_porc', 'mujeres_porc'];
        let tiposAbsolutos = ['hombres_buena', 'mujeres_buena'];
        
        let x = d3.scaleBand()
            .domain(anios)
            .range([0, width])
            .padding(0.35);

        let xAxis = function(svg) {
            svg.call(d3.axisBottom(x).tickValues(x.domain().filter(function(d,i){ if(i == 0 || i == 5 || i == 10 || i == 15 || i == 20 || i == data.length - 1){ return d; } })));
            svg.call(function(g){g.selectAll('.tick line').remove()});
            svg.call(function(g){g.select('.domain').remove()});
        }

        svg.append("g")
            .attr("transform", "translate(0," + height + ")")
            .call(xAxis);

        let y = d3.scaleLinear()
            .domain([0, 70])
            .range([ height, 0 ]);

        let yAxis = function(svg) {
            svg.call(d3.axisLeft(y).ticks(7).tickFormat(function(d,i) { return numberWithCommas3(d); }));
            svg.call(function(g) {
                g.call(function(g){
                    g.selectAll('.tick line')
                        .attr('class', function(d,i) {
                            if (d == 0) {
                                return 'line-special';
                            }
                        })
                        .attr('x1', '0%')
                        .attr('x2', `${width}`)
                });
            });
        }

        svg.append("g")
            .attr("class", "yaxis")
            .call(yAxis);

        let xSubgroup = d3.scaleBand()
            .domain(tiposPorcentajes)
            .range([0, x.bandwidth()])
            .padding([0]);

        let color = d3.scaleOrdinal()
            .domain(tiposPorcentajes)
            .range([COLOR_PRIMARY_1, COLOR_COMP_1]);

        function init() {
            svg.append("g")
                .attr('class','chart-g')
                .selectAll("g")
                .data(data)
                .enter()
                .append("g")
                .attr("transform", function(d) { return "translate(" + x(d.periodo) + ",0)"; })
                .attr('class', function(d) {
                    return 'grupo grupo-' + d.periodo;
                })
                .selectAll("rect")
                .data(function(d) { return tiposPorcentajes.map(function(key) { return {key: key, value: d[key]}; }); })
                .enter()
                .append("rect")
                .attr('class', function(d) {
                    return 'rect rect_' + d.key;
                })
                .attr("x", function(d) { return xSubgroup(d.key); })
                .attr("width", xSubgroup.bandwidth())
                .attr("fill", function(d) { return color(d.key); })
                .attr("y", function(d) { return y(0); })                
                .attr("height", function(d) { return height - y(0); })
                .on('mouseover', function(d,i,e) {
                    //Opacidad en barras
                    let css = e[i].getAttribute('class').split(' ')[1];
                    let bars = svg.selectAll('.rect');                    
            
                    bars.each(function() {
                        this.style.opacity = '0.4';
                        let split = this.getAttribute('class').split(" ")[1];
                        if(split == `${css}`) {
                            this.style.opacity = '1';
                        }
                    });

                    //Tooltip > Recuperamos el año de referencia
                    let currentYear = this.parentNode.classList[1];

                    let html = '<p class="chart__tooltip--title">' + currentYear.split('-')[1] + '</p>' + 
                                    '<p class="chart__tooltip--text">El porcentaje de esperanza de vida en buena salud respecto al total de su esperanza de vida para <b>' + d.key.split('_')[0] + '</b> es del <b>' + numberWithCommas3(parseFloat(d.value).toFixed(1)) + '%</b></p>';
                            
                    tooltip.html(html);

                    //Tooltip
                    positionTooltip(window.event, tooltip);
                    getInTooltip(tooltip);

                })
                .on('mouseout', function(d,i,e) {
                    //Quitamos los estilos de la línea
                    let bars = svg.selectAll('.rect');
                    bars.each(function() {
                        this.style.opacity = '1';
                    });
                
                    //Quitamos el tooltip
                    getOutTooltip(tooltip); 
                })
                .transition()
                .duration(2000)
                .attr("y", function(d) { return y(d.value); })                
                .attr("height", function(d) { return height - y(d.value); });
        }

        function setChart(type) {
            if(type != currentType) {
                if(type == 'Porcentajes') {
                    //Escala Y
                    y.domain([0,70]);
                    svg.select('.yaxis').call(yAxis);

                    //Colores
                    color.domain(tiposPorcentajes);

                    //Subgrupo
                    xSubgroup.domain(tiposPorcentajes);

                    //Datos
                    svg.select('.chart-g')
                        .remove();

                    //Nuevo gráfico
                    svg.append("g")
                        .attr('class','chart-g')
                        .selectAll("g")
                        .data(data)
                        .enter()
                        .append("g")
                        .attr("transform", function(d) { return "translate(" + x(d.periodo) + ",0)"; })
                        .attr('class', function(d) {
                            return 'grupo grupo-' + d.periodo;
                        })
                        .selectAll("rect")
                        .data(function(d) { return tiposPorcentajes.map(function(key) { return {key: key, value: d[key]}; }); })
                        .enter()
                        .append("rect")
                        .attr('class', function(d) {
                            return 'rect rect_' + d.key;
                        })
                        .attr("x", function(d) { return xSubgroup(d.key); })
                        .attr("width", xSubgroup.bandwidth())
                        .attr("fill", function(d) { return color(d.key); })
                        .attr("y", function(d) { return y(0); })                
                        .attr("height", function(d) { return height - y(0); })
                        .on('mouseover', function(d,i,e) {
                            //Opacidad en barras
                            let css = e[i].getAttribute('class').split(' ')[1];
                            let bars = svg.selectAll('.rect');                    
                    
                            bars.each(function() {
                                this.style.opacity = '0.4';
                                let split = this.getAttribute('class').split(" ")[1];
                                if(split == `${css}`) {
                                    this.style.opacity = '1';
                                }
                            });

                            //Tooltip > Recuperamos el año de referencia
                            let currentYear = this.parentNode.classList[1];

                            let html = '<p class="chart__tooltip--title">' + currentYear.split('-')[1] + '</p>' + 
                                    '<p class="chart__tooltip--text">El porcentaje de esperanza de vida en buena salud respecto al total de su esperanza de vida para <b>' + d.key.split('_')[0] + '</b> es del <b>' + numberWithCommas3(parseFloat(d.value).toFixed(1)) + '%</b></p>';
                            
                            tooltip.html(html);

                            //Tooltip
                            positionTooltip(window.event, tooltip);
                            getInTooltip(tooltip);

                        })
                        .on('mouseout', function(d,i,e) {
                            //Quitamos los estilos de la línea
                            let bars = svg.selectAll('.rect');
                            bars.each(function() {
                                this.style.opacity = '1';
                            });
                        
                            //Quitamos el tooltip
                            getOutTooltip(tooltip); 
                        })
                        .transition()
                        .duration(2000)
                        .attr("y", function(d) { return y(d.value); })                
                        .attr("height", function(d) { return height - y(d.value); });
                } else {
                    //Escala Y
                    y.domain([0,14]);
                    svg.select('.yaxis').call(yAxis);

                    //Colores
                    color.domain(tiposAbsolutos);

                    //Subgrupo
                    xSubgroup.domain(tiposAbsolutos);

                    //Datos
                    svg.select('.chart-g')
                        .remove();

                    //Nuevo gráfico
                    svg.append("g")
                        .attr('class','chart-g')
                        .selectAll("g")
                        .data(data)
                        .enter()
                        .append("g")
                        .attr("transform", function(d) { return "translate(" + x(d.periodo) + ",0)"; })
                        .attr('class', function(d) {
                            return 'grupo grupo-' + d.periodo;
                        })
                        .selectAll("rect")
                        .data(function(d) { return tiposAbsolutos.map(function(key) { return {key: key, value: d[key]}; }); })
                        .enter()
                        .append("rect")
                        .attr('class', function(d) {
                            return 'rect rect_' + d.key;
                        })
                        .attr("x", function(d) { return xSubgroup(d.key); })
                        .attr("width", xSubgroup.bandwidth())
                        .attr("fill", function(d) { return color(d.key); })
                        .attr("y", function(d) { return y(0); })                
                        .attr("height", function(d) { return height - y(0); })
                        .on('mouseover', function(d,i,e) {
                            //Opacidad en barras
                            let css = e[i].getAttribute('class').split(' ')[1];
                            let bars = svg.selectAll('.rect');                    
                    
                            bars.each(function() {
                                this.style.opacity = '0.4';
                                let split = this.getAttribute('class').split(" ")[1];
                                if(split == `${css}`) {
                                    this.style.opacity = '1';
                                }
                            });

                            //Tooltip > Recuperamos el año de referencia
                            let currentYear = this.parentNode.classList[1];

                            let dataTotal = data.filter(function(item) { if(item.periodo == currentYear.split('-')[1]) { return item; }})[0];
                            let totalSexo = dataTotal[`${d.key.split('_')[0]}_total`];

                            let html = '<p class="chart__tooltip--title">' + currentYear.split('-')[1] + '</p>' + 
                                    '<p class="chart__tooltip--text">Los años de esperanza de vida en buena salud para <b>' + d.key.split('_')[0] + '</b> son <b>' + numberWithCommas3(parseFloat(d.value).toFixed(1)) + '</b> años (de un total de <b>' + numberWithCommas3(parseFloat(totalSexo).toFixed(1)) + '</b> esperados)</p>';
                            
                            tooltip.html(html);

                            //Tooltip
                            positionTooltip(window.event, tooltip);
                            getInTooltip(tooltip);

                        })
                        .on('mouseout', function(d,i,e) {
                            //Quitamos los estilos de la línea
                            let bars = svg.selectAll('.rect');
                            bars.each(function() {
                                this.style.opacity = '1';
                            });
                        
                            //Quitamos el tooltip
                            getOutTooltip(tooltip); 
                        })
                        .transition()
                        .duration(2000)
                        .attr("y", function(d) { return y(d.value); })                
                        .attr("height", function(d) { return height - y(d.value); });
                }
            }
        }

        function animateChart() {
            svg.selectAll(".rect")
                .attr("x", function(d) { return xSubgroup(d.key); })
                .attr("width", xSubgroup.bandwidth())
                .attr("fill", function(d) { return color(d.key); })
                .attr("y", function(d) { return y(0); })                
                .attr("height", function(d) { return height - y(0); })
                .transition()
                .duration(2000)
                .attr("y", function(d) { return y(d.value); })                
                .attr("height", function(d) { return height - y(d.value); });
        }

        //////
        ///// Resto - Chart
        //////
        init();

        //Uso de dos botones para ofrecer datos absolutos y en miles
        document.getElementById('data_absolutos').addEventListener('click', function() {
            //Cambiamos color botón
            document.getElementById('data_porcentajes').classList.remove('active');
            document.getElementById('data_absolutos').classList.add('active');

            //Cambio en el texto
            document.getElementById('texto-reactivo').textContent = 'Esperanza de vida saludable';

            //Cambiamos gráfico
            setChart('Absolutos');

            //Cambiamos valor actual
            currentType = 'Absolutos';

            //Captura de pantalla de la visualización
            setTimeout(() => {
                setChartCanvas();
            }, 4000);
        });

        document.getElementById('data_porcentajes').addEventListener('click', function() {
            //Cambiamos color botón
            document.getElementById('data_porcentajes').classList.add('active');
            document.getElementById('data_absolutos').classList.remove('active');

            //Cambio en el texto
            document.getElementById('texto-reactivo').textContent = 'Porcentaje';

            //Cambiamos gráfico
            setChart('Porcentajes');

            //Cambiamos valor actual
            currentType = 'Porcentajes';

            //Captura de pantalla de la visualización
            setTimeout(() => {
                setChartCanvas();
            }, 4000);
        });

        //Animación del gráfico
        document.getElementById('replay').addEventListener('click', function() {
            animateChart();

            setTimeout(() => {
                setChartCanvas(); 
            }, 4000);
        });

        //////
        ///// Resto
        //////

        //Iframe
        setFixedIframeUrl('informe_perfil_mayores_2022_salud_2_4','evolucion_edv_saludable');

        //Redes sociales > Antes tenemos que indicar cuál sería el texto a enviar
        setRRSSLinks('evolucion_edv_saludable');

        //Captura de pantalla de la visualización
        setTimeout(() => {
            setChartCanvas(); 
        }, 4000);     

        let pngDownload = document.getElementById('pngImage');

        pngDownload.addEventListener('click', function(){
            setChartCanvasImage('evolucion_edv_saludable');
        });

        //Altura del frame
        setChartHeight();
    });

    
}