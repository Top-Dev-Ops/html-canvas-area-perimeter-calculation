var canvas = document.getElementById('canvas');
var scene = document.getElementById('canvas_background');
var img = document.getElementById('background');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
scene.width = window.innerWidth;
scene.height = window.innerHeight;
var ctx = canvas.getContext('2d');
var sceneCtx = scene.getContext('2d');
var selected_tool = null;
var isDown = false;
var rect = canvas.getBoundingClientRect();
var minimize_clicked = false;
var x, y;
var hide_image = false;
var hide_canvas = false;
var area_length = 1;
var scale = 5;
var zoom_scale = 1;
var zoom_wheel = 0;
var area_other = false;
var area_details_show = false;

var tempWidth, tempHeight;

var verticalTop = null,
    verticalBottom = null,
    horizontalLeft = null,
    horizontalRight = null;

// redrawing polygon object
var perimeter_list = [];
var point_list = [];

// pen tool beyond proximity 
var beyond = false;

// Zoom & Drag
var isDraggable = false;
var currentX = scene.width / 2;
var currentY = scene.height / 2;
var startX;
var startY;
var resizerRadius = 2;
var rr = resizerRadius * resizerRadius;
var draggingResizer = { x: 0, y: 0 };
var imageX = 50;
var imageY = 50;
var imageRight, imageBottom;
var dragged;
var dragStart;


var selected_vertex_id = -1;

var perimeter = new Array();
var complete = false;

var centerX, centerY, radiusX, radiusY;

// Magic Wand Variables
colorThreshold = 15;
blurRadius = 5;
simplifyTolerant = 0;
simplifyCount = 30;
hatchLength = 4;
hatchOffset = 0;
var imageInfo = null;
cacheInd = null;
mask = null;
downPoint = null;
allowDraw = false;
currentThreshold = colorThreshold;
magicX_rate = 0;
magicY_rate = 0;

// draw grids on canvas.
$(function() {
    // if (!window.location.href.includes('greatitteam.site')) {
    //     window.location.href = "https://google.com";
    // }
    gridLine();
    trackTransforms(sceneCtx);
    var area_details_1 = document.getElementById('area_details_1');
    var area_info_1 = document.getElementById('area_info_1');
    document.getElementById('area_index_1').style.color = 'white';
    document.getElementById('area_1').style.background = '#5c5b58';
    area_details_1.style.position = 'absolute';
    area_details_1.style.left = area_info_1.getBoundingClientRect().right - (area_details_1.getBoundingClientRect().right - area_details_1.getBoundingClientRect().left);
    area_details_1.style.top = area_info_1.getBoundingClientRect().top - (area_details_1.getBoundingClientRect().bottom - area_details_1.getBoundingClientRect().top);
});

function gridLine(zoom_scale = 1) {
    sceneCtx.beginPath();
    sceneCtx.strokeStyle = '#dbd3d3';
    for (x = 0; x <= canvas.width; x += 40 * zoom_scale) {
        sceneCtx.moveTo(x, 0);
        sceneCtx.lineTo(x, canvas.height);
        for (y = 0; y <= canvas.height; y += 40 * zoom_scale) {
            sceneCtx.moveTo(0, y);
            sceneCtx.lineTo(canvas.width, y);
        }
    }
    sceneCtx.stroke();
}

// scale canvas when the scale value is changed(by either clicking scale up/down buttons or inputing value manually.)
document.getElementById('scale_up_button').addEventListener('click', function(e) {
    scale++;
    document.getElementById('scale_text').value = scale;
});
document.getElementById('scale_down_button').addEventListener('click', function(e) {
    scale--;
    document.getElementById('scale_text').value = scale;
});
document.getElementById('scale_text').addEventListener('change', e => {
    scale = e.target.value;
});

// settings dropdown
document.getElementById('settings_button').addEventListener('click', function(e) {
    document.getElementById('line_tool_card').style.display = 'none';
    document.getElementById('magic_wand_tool_card').style.display = 'none';
});
document.getElementById('clear_canvas').addEventListener('click', function(e) {
    sceneCtx.clearRect(0, 0, scene.width, scene.height);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    gridLine();
    initializeVariables();
});
document.getElementById('save').addEventListener('click', function(e) {

});
document.getElementById('export').addEventListener('click', function(e) {
    var blob = new Blob([JSON.stringify(perimeter_list)], { type: 'text/plain;chartset=utf-8' });
    saveAs(blob, "static.txt");
});
document.getElementById('print').addEventListener('click', function(e) {
    window.print();
});
// import file from file dialog and set it as background.
document.getElementById('file').addEventListener('change', function(e) {
    sceneCtx.clearRect(0, 0, canvas.width, canvas.height);
    readURL(this);
});
document.getElementById('show_map').addEventListener('click', function(e) {

});

// hide & show image or canvas.
document.getElementById('hide_image').addEventListener('click', function(e) {
    if (!hide_image) {
        scene.style.display = 'none';
        document.getElementById('hide_image').innerText = 'SHOW IMAGE';
        hide_image = true;
    } else {
        scene.style.display = 'block';
        document.getElementById('hide_image').innerText = 'HIDE IMAGE';
        hide_image = false;
    }
});
document.getElementById('hide_canvas').addEventListener('click', function(e) {
    if (!hide_canvas) {
        canvas.style.display = 'none';
        document.getElementById('hide_canvas').innerText = 'SHOW CANVAS';
        hide_canvas = true;
    } else {
        canvas.style.display = 'block';
        document.getElementById('hide_canvas').innerText = 'HIDE CANVAS';
        hide_canvas = false;
    }
});

// area list add at the bottom of the screen.
document.getElementById('area_add').addEventListener('click', function() {
    perimeter_list.push(perimeter);
    if (selected_tool == 'line_tool_circle') {
        point_list.push([horizontalRight, verticalBottom, horizontalLeft, verticalTop]);
    } else {
        point_list.push(null);
    }
    area_length++;
    document.getElementById('area_panel').insertAdjacentHTML('beforeend', "<li class='list-group-item' id='area_" + area_length + "' onclick='area_panel_clicked(this);'><span class='area-index' id='area_index_" + area_length + "'>" + area_length + "</span></li>");
    document.getElementById('area_panel').insertAdjacentHTML('beforeend', "<div class='list-group-item area_info' id='area_info_" + area_length + "'><svg class='bi bi-square' width='1em' height='1em' viewBox='0 0 16 16' fill='white' xmlns='http://www.w3.org/2000/svg'><path fill-rule='evenodd' d='M14 1H2a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1zM2 0a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2H2z'/></svg><span style='color: white;' id='area_perimeter_" + area_length + "'>0 cm</span><svg class='bi bi-square-fill' width='1em' height='1em' viewBox='0 0 16 16' fill='white' xmlns='http://www.w3.org/2000/svg'><rect width='16' height='16' rx='2'/></svg><span style='color: white;' id='area_area_" + area_length + "'>0 cm<sup>2</sup></span></div>");

    var area_text = calcAreaDetails(0);
    document.body.insertAdjacentHTML('beforeend', "<div class='card text-white bg-secondary' style='z-index: 500; padding-left: 5px; padding-right: 5px;' id='area_details_" + area_length + "'>" + area_text + "</div>");
    var area_details = document.getElementById('area_details_' + area_length);
    var area_info = document.getElementById('area_info_' + area_length);
    area_details.style.position = 'absolute';
    area_details.style.left = area_info.getBoundingClientRect().right - (area_details.getBoundingClientRect().right - area_details.getBoundingClientRect().left);
    area_details.style.top = area_info.getBoundingClientRect().top - (area_details.getBoundingClientRect().bottom - area_details.getBoundingClientRect().top);
    area_details.style.display = 'none';

    document.getElementById('area_index_' + area_length).style.color = 'white';
    document.getElementById('area_' + area_length).style.background = '#5c5b58';
    
    var index = area_length - 1;
    while (index > 0) {
        document.getElementById('area_info_' + index).style.display = 'none';
        document.getElementById('area_details_' + index).style.display = 'none';
        document.getElementById('area_' + index).style.background = 'white'
        document.getElementById('area_index_' + index).style.color = 'red';
        index--;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    initializeVariables();
    area_details_show = false;
});

function area_panel_clicked(event) {
    var index = 1;
    var area_info = null;
    area_details_show = false;
    perimeter_list.push(perimeter);
    if (selected_tool == 'line_tool_circle') {
        point_list.push([horizontalRight, verticalBottom, horizontalLeft, verticalTop]);
    } else {
        point_list.push([perimeter[0]]);
    }
    selected_tool = '';
    complete = true;
    while (index <= area_length) {
        if (index == event.innerText) {
            perimeter = new Array();
            perimeter_list[index - 1].forEach(elem => {
                perimeter.push(elem);
            });

            var temp_area = document.getElementById('area_area_' + index).innerText;
            temp_area = temp_area.substring(0, temp_area.length - 4);
            var a = calcAreaDetails(temp_area);
            document.getElementById('area_details_' + index).innerHTML = a;

            draw(true);
            if (point_list[index - 1] == null) {
                perimeter.forEach(elem => {
                    point(elem.x, elem.y);
                });
            } else {
                point_list[index - 1].forEach(elem => point(elem.x, elem.y));
            }
            complete = true;
            var area_index_div = document.getElementById('area_' + index);
            var area_index = document.getElementById('area_index_' + index);
            area_index.style.color = 'white';
            area_index_div.style.background = '#5c5b58';
            area_info = document.getElementById('area_info_' + index);
            area_info.style.display = 'block';
        } else {
            document.getElementById('area_' + index).style.background = 'white'
            document.getElementById('area_index_' + index).style.color = 'red';
            document.getElementById('area_info_' + index).style.display = 'none';
            document.getElementById('area_details_' + index).style.display = 'none';
        }
        index++;
    }
}

document.body.addEventListener('mousedown', function(e) {
    if (e.target.id.includes('area_area_')) {
        id = e.target.id.split('_')[e.target.id.split('_').length - 1];
        var index = 1;
        while (index <= area_length) {
            if (id == index) {
                area_details_show = !area_details_show;
                if (area_details_show) {
                    document.getElementById('area_details_' + index).style.display = 'block';
                    document.getElementById('area_details_' + index).style.left = document.getElementById('area_info_' + index).getBoundingClientRect().right - 120;
                    document.getElementById('area_details_' + index).style.top = document.getElementById('area_info_' + index).getBoundingClientRect().top - 265;
                } else {
                    document.getElementById('area_details_' + index).style.display = 'none';
                }
            } else {
                document.getElementById('area_details_' + index).style.display = 'none';
            }
            index++;
        }
    }
}, false);

// hide & show the main tool card when the 'minimize' button is clicked.
document.getElementById('minimize').addEventListener('click', function(e) {
    document.getElementById('line_tool_card').style.display = 'none';
    document.getElementById('magic_wand_tool_card').style.display = 'none';
    minimize_clicked = !minimize_clicked;
    if (minimize_clicked) {
        document.getElementById('main_tool_card').style.display = 'none';
    } else {
        document.getElementById('main_tool_card').style.display = 'block';
    }
});

// main tool card selection.
document.getElementById('line_tool').addEventListener('click', function(e) {
    document.getElementById('line_tool_card').style.display = 'block';
    document.getElementById('magic_wand_tool_card').style.display = 'none';
    canvas.style.zIndex = "12";
});
document.getElementById('magic_wand_tool').addEventListener('click', function(e) {
    document.getElementById('line_tool_card').style.display = 'none';
    document.getElementById('magic_wand_tool_card').style.display = 'block';
});
document.getElementById('pen_tool').addEventListener('click', function(e) {
    document.getElementById('line_tool_card').style.display = 'none';
    document.getElementById('magic_wand_tool_card').style.display = 'none';
    selected_tool = 'pen_tool';
    canvas.style.zIndex = "12";
});
document.getElementById('zoom_in_tool').addEventListener('click', function(e) {
    document.getElementById('line_tool_card').style.display = 'none';
    document.getElementById('magic_wand_tool_card').style.display = 'none';
    selected_tool = "zoom_in_tool";
    scene.style.cursor = "zoom-in";
});
document.getElementById('zoom_out_tool').addEventListener('click', function(e) {
    document.getElementById('line_tool_card').style.display = 'none';
    document.getElementById('magic_wand_tool_card').style.display = 'none';
    selected_tool = "zoom_out_tool";
    scene.style.cursor = "zoom-out";
});
document.getElementById('hand_tool').addEventListener('click', function(e) {
    document.getElementById('line_tool_card').style.display = 'none';
    document.getElementById('magic_wand_tool_card').style.display = 'none';
    selected_tool = "hand_tool";
    canvas.style.zIndex = "2";
    scene.style.cursor = "move";
});
document.getElementById('undo_tool').addEventListener('click', function(e) {
    document.getElementById('line_tool_card').style.display = 'none';
    document.getElementById('magic_wand_tool_card').style.display = 'none';
    selected_tool = "undo_tool";
});

// line tool card selection.
document.getElementById('line_tool_line').addEventListener('click', function() {
    initializeVariables();
    selected_tool = 'line_tool_line';
    document.getElementById('line_tool_card').style.display = 'none';
});
document.getElementById('line_tool_rectangle').addEventListener('click', function() {
    initializeVariables();
    selected_tool = 'line_tool_rectangle';
    document.getElementById('line_tool_card').style.display = 'none';
});
document.getElementById('line_tool_circle').addEventListener('click', function() {
    initializeVariables();
    selected_tool = 'line_tool_circle';
    document.getElementById('line_tool_card').style.display = 'none';
});

// magic wand tool card selection
document.getElementById('magic_wand_tool_magic').addEventListener('click', function() {
    selected_tool = 'magic_wand_tool_magic';
    document.getElementById('magic_wand_tool_card').style.display = 'none';
    scene.style.zIndex = 2;
});

// mouse events to canvas
canvas.addEventListener('mouseup', mouseUp, false);
canvas.addEventListener('mousedown', mouseDown, false);
canvas.addEventListener('mousemove', mouseMove, false);
canvas.addEventListener('mousewheel', mouseWheel, false);
canvas.addEventListener('dblclick', dblClick, false);
// mouse events to scene(background canvas)
scene.addEventListener('mouseup', sceneMouseUp, false);
scene.addEventListener('mousedown', sceneMouseDown, false);
scene.addEventListener('mousemove', sceneMouseMove, false);
scene.addEventListener('mousewheel', sceneMouseWheel, false);

var initialLeft;

var readURL = function(input) {
    filename = input.files[0].name;
    if (input.files && input.files[0]) {
        var reader = new FileReader();
        reader.onload = function(e) {
            sceneCtx.clearRect(0, 0, sceneCtx.width, sceneCtx.height);
            img.src = e.target.result;
            tempWidth = img.width;
            tempHeight = img.height;
            setTimeout(() => {
                imageX = (scene.width - tempWidth) / 2;
                imageY = (scene.height - tempHeight) / 2;
                initialLeft = { x: imageX, y: imageY };
                
                var p1 = sceneCtx.transformedPoint(0, 0);
                var p2 = sceneCtx.transformedPoint(scene.width, scene.height);
                sceneCtx.clearRect(p1.x, p1.y, p2.x - p1.x, p2.y - p1.y);
                sceneCtx.drawImage(img, imageX, imageY);
                gridLine();
            }, 200);
        }
        reader.readAsDataURL(input.files[0]);

    }
}

function line_intersects(p0, p1, p2, p3) {
    var s1_x, s1_y, s2_x, s2_y;
    s1_x = p1['x'] - p0['x'];
    s1_y = p1['y'] - p0['y'];
    s2_x = p3['x'] - p2['x'];
    s2_y = p3['y'] - p2['y'];
    var s, t;
    s = (-s1_y * (p0['x'] - p2['x']) + s1_x * (p0['y'] - p2['y'])) / (-s2_x * s1_y + s1_x * s2_y);
    t = (s2_x * (p0['y'] - p2['y']) - s2_y * (p0['x'] - p2['x'])) / (-s2_x * s1_y + s1_x * s2_y);
    if (s >= 0 && s <= 1 && t >= 0 && t <= 1) {
        // Collision detected
        return true;
    }
    return false; // No collision
}

// make square around every single point
function point(x, y) {
    ctx.fillStyle = "red";
    ctx.strokeStyle = "red";
    ctx.fillRect(x - 3, y - 3, 6, 6);
    ctx.moveTo(x, y);
}

function draw(end) {
    ctx.lineWidth = 1;
    ctx.strokeStyle = "white";
    ctx.lineCap = "square";
    ctx.beginPath();

    for (var i = 0; i < perimeter.length; i++) {
        if (i == 0) {
            ctx.moveTo(perimeter[i]['x'], perimeter[i]['y']);
            end || point(perimeter[i]['x'], perimeter[i]['y']);
        } else {
            ctx.lineTo(perimeter[i]['x'], perimeter[i]['y']);
            end || point(perimeter[i]['x'], perimeter[i]['y']);
        }
    }
    if (end) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.lineTo(perimeter[0]['x'], perimeter[0]['y']);
        ctx.closePath();
        ctx.fillStyle = 'rgba(255, 0, 0, 0.5)';
        ctx.fill();
        ctx.strokeStyle = 'blue';
        // complete = true;
    }
    ctx.stroke();
}

function check_intersect(x, y) {
    if (perimeter.length < 4) {
        return false;
    }
    var p0 = new Array();
    var p1 = new Array();
    var p2 = new Array();
    var p3 = new Array();
    p2['x'] = perimeter[perimeter.length - 1]['x'];
    p2['y'] = perimeter[perimeter.length - 1]['y'];
    p3['x'] = x;
    p3['y'] = y;
    for (var i = 0; i < perimeter.length - 1; i++) {
        p0['x'] = perimeter[i]['x'];
        p0['y'] = perimeter[i]['y'];
        p1['x'] = perimeter[i + 1]['x'];
        p1['y'] = perimeter[i + 1]['y'];
        if (p1['x'] == p2['x'] && p1['y'] == p2['y']) { continue; }
        if (p0['x'] == p3['x'] && p0['y'] == p3['y']) { continue; }
        if (line_intersects(p0, p1, p2, p3) == true) {
            return true;
        }
    }
    return false;
}

function drawRecCircle(x1, y1, x2, y2) {
    if (selected_tool === 'line_tool_rectangle') {
        perimeter = new Array();
        perimeter.push({ 'x': x1, 'y': y1 });
        perimeter.push({ 'x': x1, 'y': y2 });
        perimeter.push({ 'x': x2, 'y': y2 });
        perimeter.push({ 'x': x2, 'y': y1 });
        draw(true);
        point(x1, y1);
        point(x1, y2);
        point(x2, y1);
        point(x2, y2);
    } else if (selected_tool === 'line_tool_circle') {
        radiusX = (x2 - x1) * 0.5, // radius for x based on input
            radiusY = (y2 - y1) * 0.5, // radius for y based on input
            centerX = x1 + radiusX, // calc center
            centerY = y1 + radiusY,
            step = 0.01, // resolution of ellipse
            a = step, // counter
            pi2 = Math.PI * 2 - step; // end angle

        horizontalLeft = null;
        horizontalRight = null;
        verticalTop = null;
        verticalBottom = null;

        perimeter = new Array();
        horizontalRight = { 'x': parseInt(centerX + radiusX * Math.cos(0)), 'y': parseInt(centerY + radiusY * Math.sin(0)) };
        horizontalLeft = null;
        verticalTop = null;
        verticalBottom = null;
        perimeter.push(horizontalRight);
        // create the ellipse    
        for (; a < pi2; a += step) {
            if (a <= Math.PI / 2 + step && a >= Math.PI / 2 - step) {
                if (!verticalBottom) {
                    verticalBottom = { 'x': parseInt(centerX + radiusX * Math.cos(a)), 'y': parseInt(centerY + radiusY * Math.sin(a)) };
                    perimeter.push(verticalBottom);
                    continue;
                }
            }
            if (a <= Math.PI + step && a >= Math.PI - step) {
                if (!horizontalLeft) {
                    horizontalLeft = { 'x': parseInt(centerX + radiusX * Math.cos(a)), 'y': parseInt(centerY + radiusY * Math.sin(a)) };
                    perimeter.push(horizontalLeft);
                    continue;
                }
            }
            if (a <= Math.PI * 1.5 + step && a >= Math.PI * 1.5 - step) {
                if (!verticalTop) {
                    verticalTop = { 'x': parseInt(centerX + radiusX * Math.cos(a)), 'y': parseInt(centerY + radiusY * Math.sin(a)) };
                    perimeter.push(verticalTop);
                    continue;
                }
            }
            perimeter.push({ 'x': parseInt(centerX + radiusX * Math.cos(a)), 'y': parseInt(centerY + radiusY * Math.sin(a)) });
        }
        draw(true);
        point(horizontalLeft['x'], horizontalLeft['y']);
        point(horizontalRight['x'], horizontalRight['y']);
        point(verticalBottom['x'], verticalBottom['y']);
        point(verticalTop['x'], verticalTop['y']);
    }
}

function check_perimeter_pt_clicked(x, y, perimeter) {
    var len = perimeter.length - 1;
    while (len > -1) {
        if (x > perimeter[len]['x'] - 10 && x < perimeter[len]['x'] + 10 &&
            y > perimeter[len]['y'] - 10 && y < perimeter[len]['y'] + 10) {
            return len;
        }
        len -= 1;
    }
    return len;
}

function while_pt_Move(ev) {
    perimeter[selected_vertex_id]['x'] = ev.clientX;
    perimeter[selected_vertex_id]['y'] = ev.clientY;
    if (check_intersect(ev.clientX, ev.clientY)) {
        console.log("ERROR");
    }
    // ctx.clearRect(0, 0, canvas.width, canvas.height); // deleted by rjh:6.26
    draw(true);
    perimeter.forEach(element => {
        point(element['x'], element['y']);
    });
    document.getElementById('area_perimeter_' + area_length).innerHTML = calc_area_perimeter(perimeter).perimeter + ' cm';
    document.getElementById('area_area_' + area_length).innerHTML = calc_area_perimeter(perimeter).area + ' cm<sup>2</sup>';
    var temp_area = document.getElementById('area_area_' + area_length).innerText;
    temp_area = temp_area.substring(0, temp_area.length - 4);
    var a = calcAreaDetails(temp_area);
    document.getElementById('area_details_' + area_length).innerHTML = a;
    document.getElementById('area_details_' + area_length).style.display = 'none';
}

function calc_area_perimeter(coordsarray) {
    var area = 0;
    var perimeter_length = 0;
    var tmp = new Array();
    coordsarray.forEach(elem => tmp.push(elem));
    tmp.push(coordsarray[0]);
    var id = 0;

    while (id < tmp.length - 1) {
        area += (tmp[id]['x'] * tmp[id + 1]['y'] - tmp[id + 1]['x'] * tmp[id]['y']);
        if (id != tmp.length - 1) {
            perimeter_length += Math.sqrt(
                (tmp[id]['x'] - tmp[id + 1]['x']) *
                (tmp[id]['x'] - tmp[id + 1]['x']) +
                (tmp[id]['y'] - tmp[id + 1]['y']) *
                (tmp[id]['y'] - tmp[id + 1]['y']));
        }
        id += 1;
    }

    tmp_area = area / Math.pow(zoom_scale, 2);
    tmp_perimeter_length = perimeter_length / zoom_scale;
    area = tmp_area;
    perimeter_length = tmp_perimeter_length;
    var result = { 'area': Math.abs(area / 2).toFixed(2), 'perimeter': perimeter_length.toFixed(2) };
    return result;
}

function mouseDown(event) {
    document.getElementById('line_tool_card').style.display = 'none';
    document.getElementById('magic_wand_tool_card').style.display = 'none';
    switch (selected_tool) {
        case 'line_tool_line':
            if (complete) {
                var x1 = event.clientX;
                var y1 = event.clientY;
                var id = check_perimeter_pt_clicked(x1, y1, perimeter)
                if (id != -1) { // clicked
                    canvas.style.cursor = 'crosshair';
                    selected_vertex_id = id;
                    var endMove = function() {
                        canvas.removeEventListener('mousemove', while_pt_Move);
                        canvas.removeEventListener('mouseup', endMove);
                    };

                    event.stopPropagation();
                    canvas.addEventListener('mousemove', while_pt_Move);
                    canvas.addEventListener('mouseup', endMove);
                }
                return false;
            }

            if (event.button === 2) {
                if (perimeter.length == 2) {
                    alert('You need at least three points for a polygon');
                    return false;
                }
                x = perimeter[0]['x'];
                y = perimeter[0]['y'];
                if (check_intersect(x, y)) {
                    alert('The line you are drowing intersect another line');
                    return false;
                }
                draw(true);
                complete = true;
                alert('Polygon closed');
                event.preventDefault();
                return false;
            } else {
                x = event.clientX - rect.left;
                y = event.clientY - rect.top;
                if (perimeter.length > 0) {
                    if (check_perimeter_pt_clicked(x, y, perimeter) == 0) {
                        if (perimeter.length == 2) {
                            alert('You need at least three points for a polygon');
                            return false;
                        }
                        x = perimeter[0]['x'];
                        y = perimeter[0]['y'];
                        if (check_intersect(x, y)) {
                            alert('The line you are drawing intersect another line');
                            return false;
                        }
                        draw(true);
                        complete = true;
                        perimeter.forEach(elem => {
                            point(elem['x'], elem['y']);
                        });
                        document.getElementById('area_perimeter_' + area_length).innerHTML = calc_area_perimeter(perimeter).perimeter + ' cm';
                        document.getElementById('area_area_' + area_length).innerHTML = calc_area_perimeter(perimeter).area + ' cm<sup>2</sup>';
                        var temp_area = document.getElementById('area_area_' + area_length).innerText;
                        temp_area = temp_area.substring(0, temp_area.length - 4);
                        var a = calcAreaDetails(temp_area);
                        document.getElementById('area_details_' + area_length).innerHTML = a;
                        document.getElementById('area_details_' + area_length).style.display = 'none';
                        event.preventDefault();
                        return false;
                    }
                }
                if (perimeter.length > 0 && x == perimeter[perimeter.length - 1]['x'] && y == perimeter[perimeter.length - 1]['y']) {
                    // same point - double click
                    return false;
                }
                if (check_intersect(x, y)) {
                    alert('The line you are drowing intersect another line');
                    return false;
                }
                perimeter.push({ 'x': x, 'y': y });
                draw(false);
                return false;
            }
            break;
        case 'line_tool_rectangle':
            if (complete) {
                var x1 = event.clientX;
                var y1 = event.clientY;
                var id = check_perimeter_pt_clicked(x1, y1, perimeter)
                if (id != -1) { // clicked
                    canvas.style.cursor = 'crosshair';
                    selected_vertex_id = id;
                    var endMove = function() {
                        canvas.removeEventListener('mousemove', while_pt_Move);
                        canvas.removeEventListener('mouseup', endMove);
                    };

                    event.stopPropagation();
                    canvas.addEventListener('mousemove', while_pt_Move);
                    canvas.addEventListener('mouseup', endMove);
                }
                return false;
            }

            x = event.clientX - rect.left;
            y = event.clientY - rect.top;
            canvas.style.cursor = "crosshair";
            isDown = true;
            break;
        case 'line_tool_circle':
            x = event.clientX - rect.left;
            y = event.clientY - rect.top;
            isDown = true;
            break;
        case 'pen_tool':
            x = event.clientX - rect.left;
            y = event.clientY - rect.top;
            isDown = true;
            perimeter = new Array();
            perimeter.push({ 'x': x, 'y': y });
            point(x, y);
            ctx.strokeStyle = "blue";
            ctx.beginPath();
            ctx.moveTo(x, y);
            break;
        case 'hand_tool':
            sceneMouseDown(event);
            var mouseX = event.pageX - this.offsetLeft;
            var mouseY = event.pageY - this.offsetTop;
            if (mouseX >= (currentX - tempWidth / 2) &&
                mouseX <= (currentX + tempWidth / 2) &&
                mouseY >= (currentY - tempHeight / 2) &&
                mouseY <= (currentY + tempHeight / 2)) {
                isDraggable = true;
            }
            canvas.style.cursor = "move";
            break

        case 'magic_wand_tool_magic':
            var mouseX = event.pageX - this.offsetLeft;
            var mouseY = event.pageY - this.offsetTop;
            if (event.button == 0) {
                if (mask != null) {
                    mask = null;
                }
                isDown = true;
                allowDraw = true;
                downPoint = getMousePosition(event);
                drawMask(downPoint.x, downPoint.y);
                canvas.style.cursor = 'crosshair';

            } else allowDraw = false;
            break;
    }
}

function mouseUp(event) {
    switch (selected_tool) {
        case 'line_tool_rectangle':
            // changed by rjh: 6.26
            if (perimeter === null) {
                x1 = event.clientX - rect.left;
                y1 = event.clientY - rect.top;
                drawRecCircle(x, y, x1, y1);
            }
            document.getElementById('area_perimeter_' + area_length).innerHTML = calc_area_perimeter(perimeter).perimeter + ' cm';
            document.getElementById('area_area_' + area_length).innerHTML = calc_area_perimeter(perimeter).area + ' cm<sup>2</sup>';
            var temp_area = document.getElementById('area_area_' + area_length).innerText;
            temp_area = temp_area.substring(0, temp_area.length - 4);
            var a = calcAreaDetails(temp_area);
            document.getElementById('area_details_' + area_length).innerHTML = a;
            document.getElementById('area_details_' + area_length).style.display = 'none';
            isDown = false;
            complete = true;
            break;
        case 'line_tool_circle':
            document.getElementById('area_perimeter_' + area_length).innerHTML = calc_area_perimeter(perimeter).perimeter + ' cm';
            document.getElementById('area_area_' + area_length).innerHTML = calc_area_perimeter(perimeter).area + ' cm<sup>2</sup>';
            var temp_area = document.getElementById('area_area_' + area_length).innerText;
            temp_area = temp_area.substring(0, temp_area.length - 4);
            var a = calcAreaDetails(temp_area);
            document.getElementById('area_details_' + area_length).innerHTML = a;
            document.getElementById('area_details_' + area_length).style.display = 'none';
            point(horizontalRight['x'], horizontalRight['y']);
            point(horizontalLeft['x'], horizontalLeft['y']);
            point(verticalBottom['x'], verticalBottom['y']);
            point(verticalTop['x'], verticalTop['y']);
            complete = true;
            isDown = false;
            break;
        case 'pen_tool':
            isDown = false;
            break;
        case 'hand_tool':
            sceneMouseUp(event);

            if (isDraggable) {
                currentX = event.pageX - this.offsetLeft;
                currentY = event.pageY - this.offsetTop;
            }

            drawImage();
            isDraggable = false;
            break;
        case 'magic_wand_tool_magic':
            isDown = false;
            allowDraw = false;
            break;
    }
}

function mouseMove(event) {
    if (!isDown) {
        x1 = event.clientX - rect.left;
        y1 = event.clientY - rect.top;
        if (check_perimeter_pt_clicked(x1, y1, perimeter) != -1) {
            canvas.style.cursor = "crosshair";
        } else {
            canvas.style.cursor = "default";
        }
    }
    switch (selected_tool) {
        case 'line_tool_rectangle':
            if (!isDown) return;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            x1 = event.clientX - rect.left;
            y1 = event.clientY - rect.top;
            drawRecCircle(x, y, x1, y1);
            point(x, y);
            point(x, y1);
            point(x1, y);
            point(x1, y1);
            break;
        case 'line_tool_circle':
            if (!isDown) return;
            if (complete) {
                var temp_x = event.clientX - rect.left;
                var temp_y = event.clientY - rect.top;
                if (temp_x >= parseInt(verticalTop['x']) - 10 && temp_x <= parseInt(verticalTop['x']) + 10 && temp_y >= parseInt(verticalTop['y']) - 10 && temp_y <= parseInt(verticalTop['y']) + 10) {
                    verticalTop['x'] = temp_x;
                    verticalTop['y'] = temp_y;
                    bezierCurve(horizontalLeft, { 'x': temp_x, 'y': temp_y }, horizontalRight, true);
                } else if (temp_x >= parseInt(verticalBottom['x']) - 10 && temp_x <= parseInt(verticalBottom['x']) + 10 && temp_y >= parseInt(verticalBottom['y']) - 10 && temp_y <= parseInt(verticalBottom['y']) + 10) {
                    verticalBottom['x'] = temp_x;
                    verticalBottom['y'] = temp_y;
                    bezierCurve(horizontalLeft, { 'x': temp_x, 'y': temp_y }, horizontalRight, false);
                }
            } else {
                x1 = parseInt(event.clientX - rect.left);
                y1 = parseInt(event.clientY - rect.top);
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                drawRecCircle(x, y, x1, y1);
                document.getElementById('area_perimeter_' + area_length).innerHTML = calc_area_perimeter(perimeter).perimeter + ' cm';
                document.getElementById('area_area_' + area_length).innerHTML = calc_area_perimeter(perimeter).area + ' cm<sup>2</sup>';
                var temp_area = document.getElementById('area_area_' + area_length).innerText;
                temp_area = temp_area.substring(0, temp_area.length - 4);
                var a = calcAreaDetails(temp_area);
                document.getElementById('area_details_' + area_length).innerHTML = a;
                document.getElementById('area_details_' + area_length).style.display = 'none';
            }
            break;
        case 'pen_tool':
            if (!isDown) return;
            x1 = event.clientX - rect.left;
            y1 = event.clientY - rect.top;
            perimeter.push({ 'x': x1, 'y': y1 });
            if (x1 >= x - 3 && x1 <= x + 3 && y1 >= y - 3 && y1 <= y + 3) {
                if (beyond) {
                    draw(perimeter);
                    isDown = false;
                    beyond = false;
                    document.getElementById('area_perimeter_' + area_length).innerHTML = calc_area_perimeter(perimeter).perimeter + ' cm';
                    document.getElementById('area_area_' + area_length).innerHTML = calc_area_perimeter(perimeter).area + ' cm<sup>2</sup>';
                    var temp_area = document.getElementById('area_area_' + area_length).innerText;
                    temp_area = temp_area.substring(0, temp_area.length - 4);
                    var a = calcAreaDetails(temp_area);
                    document.getElementById('area_details_' + area_length).innerHTML = a;
                    document.getElementById('area_details_' + area_length).style.display = 'none';
                }
            } else {
                beyond = true;
                ctx.lineTo(x1, y1);
                ctx.stroke();
            }
            break;
    }
}

function mouseWheel(e) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    canvas.style.zIndex = "2";
}

function dblClick(event) {
    x1 = event.clientX - rect.left;
    y1 = event.clientY - rect.top;
    var index = check_perimeter_pt_clicked(x1, y1, perimeter);
    if (index != -1) {
        canvas.style.cursor = "crosshair";
        point(perimeter[index]['x'], perimeter[index]['y']);
    } else {
        canvas.style.cursor = "default";
    }
}

function sceneMouseDown(e) {
    document.getElementById('line_tool_card').style.display = 'none';
    document.getElementById('magic_wand_tool_card').style.display = 'none';
    lastX = e.offsetX || (e.pageX - canvas.offsetLeft);
    lastY = e.offsetY || (e.pageY - canvas.offsetTop);

    switch (selected_tool) {
        case 'zoom_in_tool':
            zoom(1);
            // gridLine(zoom_scale);
            gridLine(); // changed by rjh:6.28
            zoom_wheel++;
            break;
        case 'zoom_out_tool':
            zoom(-1);
            // gridLine(zoom_scale);
            gridLine(); // changed by rjh:6.28
            zoom_wheel--;
            break;
        case 'hand_tool':
            dragStart = sceneCtx.transformedPoint(lastX, lastY);
            dragged = false;
            break;
    }
}

function sceneMouseUp(event) {
    dragStart = null;
}

function sceneMouseMove(e) {
    lastX = e.offsetX || (e.pageX - canvas.offsetLeft);
    lastY = e.offsetY || (e.pageY - canvas.offsetTop);
    if (selected_tool == 'hand_tool') {
        dragged = true;
        if (dragStart) {
            var pt = sceneCtx.transformedPoint(lastX, lastY);
            sceneCtx.translate(pt.x - dragStart.x, pt.y - dragStart.y);
            redraw();
        }
    }
    gridLine();
}

function sceneMouseWheel(e) {
    var delta = e.wheelDelta ? e.wheelDelta / 120 : e.detail ? -e.detail : 0;
    if (delta) {
        if (delta > 0) {
            scene.style.cursor = "zoom-in";
        } else {
            scene.style.cursor = "zoom-out";
        }
        zoom_wheel = delta > 0 ? zoom_wheel + 1 : zoom_wheel - 1;
        zoom_scale = Math.pow(1.1, zoom_wheel);
        zoom(delta);
        gridLine();


    }
    selected_tool = '';
    return e.preventDefault() && false;
}

function initializeVariables() {
    perimeter = new Array();
    complete = false;
    selected_tool = '';

    cacheInd = null;
    mask = null;
    downPoint = null;
    allowDraw = false;
    currentThreshold = colorThreshold;

    magicX_rate = 0;
    magicY_rate = 0;
    imageRight, imageBottom;
}

function drawImage() {
    sceneCtx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    var tempCtx = document.createElement("canvas").getContext("2d");
    tempCtx.canvas.width = window.innerWidth;
    tempCtx.canvas.height = window.innerHeight;
    tempCtx.drawImage(img, currentX - tempWidth / 2, currentY - tempHeight / 2, tempWidth, tempHeight);
    imageInfo.data = tempCtx.getImageData(currentX - imageInfo.width / 2, currentY - imageInfo.height / 2, imageInfo.width, imageInfo.height);
    sceneCtx.putImageData(imageInfo.data, currentX - imageInfo.width / 2, currentY - imageInfo.height / 2);


    if (cacheInd != null) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawBorder();
    }
    // gridLine(zoom_scale);
    gridLine(); // changed by rjh:6.28
}
var lastX = canvas.width / 2,
    lastY = canvas.height / 2;

function redraw() {
    var p1 = sceneCtx.transformedPoint(0, 0);
    var p2 = sceneCtx.transformedPoint(canvas.width, canvas.height);
    sceneCtx.clearRect(p1.x, p1.y, p2.x - p1.x, p2.y - p1.y);
    sceneCtx.drawImage(img, initialLeft.x, initialLeft.y);
    // gridLine(zoom_scale);
}

function zoom(scale) {
    var pt = sceneCtx.transformedPoint(lastX, lastY);
    sceneCtx.translate(pt.x, pt.y);
    var factor = Math.pow(1.1, scale);
    sceneCtx.scale(factor, factor);
    sceneCtx.translate(-pt.x, -pt.y);
    redraw();
}

function hatchTick() {
    hatchOffset = (hatchOffset + 1) % (hatchLength * 2);
    drawBorder(true);
}

function drawBorder(noBorder) {
    if (!mask) return;
    var x, y, i, j, k,
        w = imageInfo.width,
        h = imageInfo.height,
        otherCtx = imageInfo.context,
        imgData = otherCtx.createImageData(w, h),
        res = imgData.data;

    if (!noBorder) cacheInd = MagicWand.getBorderIndices(mask);

    otherCtx.clearRect((currentX - w / 2), (currentY - h / 2), w, h);

    coordsarray = [];
    var len = cacheInd.length;
    for (j = 0; j < len; j++) {
        i = cacheInd[j];
        x = i % w; // calc x by index
        y = (i - x) / w; // calc y by index
        k = (y * w + x) * 4;
        if ((x + y + hatchOffset) % (hatchLength * 2) < hatchLength) { // detect hatch color 
            res[k + 3] = 255; // black, change only alpha
        } else {
            res[k] = 255; // white
            res[k + 1] = 255;
            res[k + 2] = 255;
            res[k + 3] = 255;
        }
        coordsarray.push({ 'x': x, 'y': y });
    }

    // gridLine(zoom_scale);
    gridLine(); // changed by rjh:6.28
    otherCtx.putImageData(imgData, (currentX - w / 2), (currentY - h / 2));

    tmp_perimeter = [];
    tmp_perimeter = find_perimeter_using_greedy(coordsarray);

    perimeter = [];
    step = 30;
    for (i = 0; i < tmp_perimeter.length; i += step) {
        perimeter.push(tmp_perimeter[i]);
    }
    draw(true);
    document.getElementById('area_perimeter_' + area_length).innerHTML = calc_area_perimeter(perimeter).perimeter + ' cm';
    document.getElementById('area_area_' + area_length).innerHTML = calc_area_perimeter(perimeter).area + ' cm<sup>2</sup>';
    var temp_area = document.getElementById('area_area_' + area_length).innerText;
    temp_area = temp_area.substring(0, temp_area.length - 4);
    var a = calcAreaDetails(temp_area);
    document.getElementById('area_details_' + area_length).innerHTML = a;
    document.getElementById('area_details_' + area_length).style.display = 'none';
}

function getMousePosition(e) {
    x = e.clientX - rect.left;
    y = e.clientY - rect.top;
    magicX_rate = Math.floor(x - (currentX - imageInfo.width / 2)) / imageInfo.width;
    magicY_rate = Math.floor(y - (currentY - imageInfo.height / 2)) / imageInfo.height;
    return {
        x: Math.floor(x - (currentX - imageInfo.width / 2)),
        y: Math.floor(y - (currentY - imageInfo.height / 2))
    };
}

function drawMask(x, y) {
    if (!imageInfo) return;
    var image = {
        data: imageInfo.data.data,
        width: imageInfo.width,
        height: imageInfo.height,
        bytes: 4
    };
    mask = MagicWand.floodFill(image, x, y, currentThreshold, null, true);
    mask = MagicWand.gaussBlurOnlyBorder(mask, blurRadius);

    sceneCtx.putImageData(imageInfo.data, currentX - image.width / 2, currentY - image.height / 2);

    drawBorder();
};

function bezierCurve(p0, p1, p2, place) {
    temp_perimeter = new Array();
    var top_x = parseInt(2 * p1['x'] - p0['x'] / 2 - p2['x'] / 2);
    var top_y = parseInt(2 * p1['y'] - p0['y'] / 2 - p2['y'] / 2);
    var accuracy = 0.01;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.beginPath();
    ctx.strokeStyle = "#FF0000";
    ctx.fillStyle = 'rgba(255, 0, 0, 0.5)';
    var point_met = false;
    var pass = false;
    if (perimeter.length === 0) return;
    if (place) {
        temp_perimeter.push({ 'x': horizontalLeft['x'], 'y': horizontalLeft['y'] });
        for (var i = 0; i < 1.01; i += accuracy) {
            line_x = parseInt((1 - i) * (1 - i) * p0['x'] + 2 * (1 - i) * i * top_x + i * i * p2['x']);
            line_y = parseInt((1 - i) * (1 - i) * p0['y'] + 2 * (1 - i) * i * top_y + i * i * p2['y']);
            temp_perimeter.push({ 'x': line_x, 'y': line_y });
        }

        for (var i = 0; i < perimeter.length; i++) {
            if (parseInt(perimeter[i]['x']) == line_x && parseInt(perimeter[i]['y']) == line_y) {
                point_met = true;
                i++;
            }
            if (parseInt(perimeter[i]['x']) == horizontalLeft['x'] && parseInt(perimeter[i]['y']) == horizontalLeft['y']) {
                point_met = false;
                i++;
            }
            if (point_met) {
                temp_perimeter.push(perimeter[i]);
            }
        }
        perimeter = new Array();
        temp_perimeter.forEach(elem => {
            perimeter.push(elem);
        });
        draw(true);
    } else {
        temp_perimeter.push({ 'x': horizontalRight['x'], 'y': horizontalRight['y'] });
        for (var i = 0; i < 1.01; i += accuracy) {
            line_x = parseInt((1 - i) * (1 - i) * p2['x'] + 2 * (1 - i) * i * top_x + i * i * p0['x']);
            line_y = parseInt((1 - i) * (1 - i) * p2['y'] + 2 * (1 - i) * i * top_y + i * i * p0['y']);
            temp_perimeter.push({ 'x': line_x, 'y': line_y });
        }
        var index = 0;
        perimeter.forEach(elem => {
            if (elem['x'] == horizontalLeft['x'] && elem['y'] == horizontalLeft['y']) {
                point_met = true;
            } else {
                if (point_met) {
                    pass = true;
                    if (index == 0) {
                        temp_perimeter.push(horizontalLeft);
                    }
                    index++;
                }
            }
            if (elem['x'] == horizontalRight['x'] && elem['y'] == horizontalRight['y']) {
                point_met = false;
            }
            if (point_met && pass) {
                temp_perimeter.push(elem);
            }
        });
        perimeter = new Array();
        temp_perimeter.forEach(elem => {
            perimeter.push(elem);
        });
        draw(true);
    }

    document.getElementById('area_perimeter_' + area_length).innerHTML = calc_area_perimeter(perimeter).perimeter + ' cm';
    document.getElementById('area_area_' + area_length).innerHTML = calc_area_perimeter(perimeter).area + ' cm<sup>2</sup>';
    var temp_area = document.getElementById('area_area_' + area_length).innerText;
    temp_area = temp_area.substring(0, temp_area.length - 4);
    var a = calcAreaDetails(temp_area);
    document.getElementById('area_details_' + area_length).innerHTML = a;
    document.getElementById('area_details_' + area_length).style.display = 'none';
};

function hitImage(x, y) {
    return (x > imageX && x < imageX + tempWidth && y > imageY && y < imageY + tempHeight);
}

function anchorHitTest(x, y) {
    var dx, dy;
    // top-left
    dx = x - imageX;
    dy = y - imageY;
    if (dx * dx + dy * dy <= rr) { return (0); }
    // top-right
    dx = x - imageRight;
    dy = y - imageY;
    if (dx * dx + dy * dy <= rr) { return (1); }
    // bottom-right
    dx = x - imageRight;
    dy = y - imageBottom;
    if (dx * dx + dy * dy <= rr) { return (2); }
    // bottom-left
    dx = x - imageX;
    dy = y - imageBottom;
    if (dx * dx + dy * dy <= rr) { return (3); }
    return (-1);
}

function find_perimeter_using_greedy(coordsarray) {
    let id = 0;
    let min_distance;
    let id_array = [];
    let x, y, x1, y1;
    let subid = 0;
    while (id < coordsarray.length) {
        subid = id + 1;
        if (subid == coordsarray.length) break;

        x = coordsarray[id]['x'];
        y = coordsarray[id]['y'];
        x1 = coordsarray[subid]['x'];
        y1 = coordsarray[subid]['y'];

        min_distance = Math.sqrt(Math.pow(x - x1, 2) + Math.pow(y - y1, 2));
        while (subid < coordsarray.length) {
            x1 = coordsarray[subid]['x'];
            y1 = coordsarray[subid]['y'];
            dist = Math.sqrt(Math.pow(x - x1, 2) + Math.pow(y - y1, 2));
            if (dist < min_distance) {
                min_distance = dist;
                id_array.push(subid);
            }
            subid += 1;
        }
        if (id_array.length !== 0) { // swapping the values 
            let swap_id = id_array[id_array.length - 1];
            let tmp = {};
            tmp['x'] = coordsarray[id + 1]['x'];
            tmp['y'] = coordsarray[id + 1]['y'];
            coordsarray[id + 1]['x'] = coordsarray[swap_id]['x'];
            coordsarray[id + 1]['y'] = coordsarray[swap_id]['y'];
            coordsarray[swap_id]['x'] = tmp['x'];
            coordsarray[swap_id]['y'] = tmp['y'];

        }
        id_array = [];
        id += 1;
    }
    return coordsarray;
}

function trackTransforms(ctx) {
    var svg = document.createElementNS("http://www.w3.org/2000/svg", 'svg');
    var xform = svg.createSVGMatrix();
    ctx.getTransform = function() { return xform; };

    var savedTransforms = [];
    var save = ctx.save;
    ctx.save = function() {
        savedTransforms.push(xform.translate(0, 0));
        return save.call(ctx);
    };
    var restore = ctx.restore;
    ctx.restore = function() {
        xform = savedTransforms.pop();
        return restore.call(ctx);
    };

    var scale = ctx.scale;
    ctx.scale = function(sx, sy) {
        xform = xform.scaleNonUniform(sx, sy);
        return scale.call(ctx, sx, sy);
    };
    var rotate = ctx.rotate;
    ctx.rotate = function(radians) {
        xform = xform.rotate(radians * 180 / Math.PI);
        return rotate.call(ctx, radians);
    };
    var translate = ctx.translate;
    ctx.translate = function(dx, dy) {
        xform = xform.translate(dx, dy);
        return translate.call(ctx, dx, dy);
    };
    var transform = ctx.transform;
    ctx.transform = function(a, b, c, d, e, f) {
        var m2 = svg.createSVGMatrix();
        m2.a = a;
        m2.b = b;
        m2.c = c;
        m2.d = d;
        m2.e = e;
        m2.f = f;
        xform = xform.multiply(m2);
        return transform.call(ctx, a, b, c, d, e, f);
    };
    var setTransform = ctx.setTransform;
    ctx.setTransform = function(a, b, c, d, e, f) {
        xform.a = a;
        xform.b = b;
        xform.c = c;
        xform.d = d;
        xform.e = e;
        xform.f = f;
        return setTransform.call(ctx, a, b, c, d, e, f);
    };
    var pt = svg.createSVGPoint();
    ctx.transformedPoint = function(x, y) {
        pt.x = x;
        pt.y = y;
        return pt.matrixTransform(xform.inverse());
    }
}

function calcAreaDetails(a) {
    var area_text = "";
    var area_unit = ["nm", "mm", "cm", "m", "km", "in", "ft", "yd", "mi", "a", "ha"];
    var temp_area, b, c = 0;
    temp_area = a;
    while (temp_area > 10) {
        b = temp_area / 10;
        b = ~~b;
        c++;
        temp_area = b;
    }
    temp_area = a / (10 ** c);
    for (var i = 0; i < 11; i++) {
        if (i == 0) {
            area_text += "<p class='card-text' style='margin-bottom: 5px'><small><b>" + area_unit[i] + "<sup>2</sup>&nbsp;&nbsp;&nbsp;&nbsp;" + temp_area.toFixed(2) + " * 10<sup>" + parseInt(c + 14) + "</sup></b></small></p>";
        } else if (i == 1) {
            area_text += "<p class='card-text' style='margin-bottom: 5px'><small><b>" + area_unit[i] + "<sup>2</sup>&nbsp;&nbsp;&nbsp;" + temp_area.toFixed(2) + " * 10<sup>" + parseInt(c + 2) + "</sup></b></small></p>";
        } else if (i == 2) {
            area_text += "<p class='card-text' style='margin-bottom: 5px'><small><b>" + area_unit[i] + "<sup>2</sup>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;" + temp_area.toFixed(2) + " * 10<sup>" + c + "</sup></b></small></p>";
        } else if (i == 3) {
            area_text += "<p class='card-text' style='margin-bottom: 5px'><small><b>" + area_unit[i] + "<sup>2</sup>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;" + temp_area.toFixed(2) + " * 10<sup>" + parseInt(c - 4) + "</sup></b></small></p>";
        } else if (i == 4) {
            area_text += "<p class='card-text' style='margin-bottom: 5px'><small><b>" + area_unit[i] + "<sup>2</sup>&nbsp;&nbsp;&nbsp;&nbsp;" + temp_area.toFixed(2) + " * 10<sup>" + parseInt(c - 10) + "</sup></b></small></p>";
        } else if (i == 5) {
            area_text += "<p class='card-text' style='margin-bottom: 5px'><small><b>" + area_unit[i] + "<sup>2</sup>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;" + (1.55 * temp_area).toFixed(2) + " * 10<sup>" + parseInt(c - 1) + "</sup></b></small></p>";
        } else if (i == 6) {
            area_text += "<p class='card-text' style='margin-bottom: 5px'><small><b>" + area_unit[i] + "<sup>2</sup>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;" + (1.076 * temp_area).toFixed(2) + " * 10<sup>" + parseInt(c - 3) + "</sup></b></small></p>";
        } else if (i == 7) {
            area_text += "<p class='card-text' style='margin-bottom: 5px'><small><b>" + area_unit[i] + "<sup>2</sup>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;" + (1.196 * temp_area).toFixed(2) + " * 10<sup>" + parseInt(c - 4) + "</sup></b></small></p>";
        } else if (i == 8) {
            area_text += "<p class='card-text' style='margin-bottom: 5px'><small><b>" + area_unit[i] + "<sup>2</sup>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;" + (3.861 * temp_area).toFixed(2) + " * 10<sup>" + parseInt(c - 11) + "</sup></b></small></p>";
        } else if (i == 9) {
            area_text += "<p class='card-text' style='margin-bottom: 5px'><small><b>" + area_unit[i] + "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;" + temp_area.toFixed(2) + " * 10<sup>" + parseInt(c + 16) + "</sup></b></small></p>";
        } else {
            area_text += "<p class='card-text' style='margin-bottom: 5px'><small><b>" + area_unit[i] + "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;" + temp_area.toFixed(2) + " * 10<sup>" + parseInt(c - 8) + "</sup></b></small></p>";
        }
    }
    return area_text;
}