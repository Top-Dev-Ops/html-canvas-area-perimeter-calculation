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
var settings_clicked = false;
var minimize_clicked = false;
var x, y;
var hide_image = false;
var hide_canvas = false;
var area_length = 1;
var scale = 5;
var zoom_scale = 1;


// Zoom & Drag
var isDraggable = false;
var currentX = 0;
var currentY = 0;
currentX = scene.width/2;
currentY = scene.height/2;


var selected_vertex_id = -1;

var perimeter = new Array();
var complete = false;

// Magic Wand Variables
colorThreshold = 15;
blurRadius = 5;
simplifyTolerant = 0;
simplifyCount = 30;
hatchLength = 4;
hatchOffset = 0;

imageInfo = null;
cacheInd = null;
mask = null;
downPoint = null;
allowDraw = false;
currentThreshold = colorThreshold;

// draw grids on canvas.
$(function() {
    gridLine();
});

function gridLine(zoom_scale = 1) {
    sceneCtx.beginPath();
    sceneCtx.strokeStyle = '#dbd3d3';
    for (x = 0; x <= canvas.width; x += 20 * zoom_scale) {
        sceneCtx.moveTo(x, 0);
        sceneCtx.lineTo(x, canvas.height);
        for (y = 0; y <= canvas.height; y += 20 * zoom_scale) {
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

// clear canvas.
document.getElementById('clear_canvas').addEventListener('click', function(e) {
    sceneCtx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    gridLine();
    initializeVariables();
});
document.getElementById('save').addEventListener('click', function(e) {

});
document.getElementById('export').addEventListener('click', function(e) {

});
document.getElementById('print').addEventListener('click', function(e) {
    window.print();
});
// import file from file dialog and set it as background.
document.getElementById('file').addEventListener('change', function (e) {
    sceneCtx.clearRect(0, 0, canvas.width, canvas.height);
    readURL(this);
});
document.getElementById('show_map').addEventListener('click', function(e) {

});
document.getElementById('settings').addEventListener('click', function(e) {

});
document.getElementById('help').addEventListener('click', function(e) {

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
    area_length++;
    document.getElementById('area_panel').insertAdjacentHTML('beforeend', "<li class='list-group-item' id='area_" + area_length + "' onclick='area_panel_clicked(this);'><span class='area-index'>" + area_length + "</span></li>");
    document.getElementById('area_panel').insertAdjacentHTML('beforeend', "<div class='list-group-item area_info' id='area_info_" + area_length + "'><svg class='bi bi-square' width='1em' height='1em' viewBox='0 0 16 16' fill='white' xmlns='http://www.w3.org/2000/svg'><path fill-rule='evenodd' d='M14 1H2a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1zM2 0a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2H2z'/></svg><span style='color: white;' id='area_perimeter_" + area_length + "'>0 cm</span><svg class='bi bi-square-fill' width='1em' height='1em' viewBox='0 0 16 16' fill='white' xmlns='http://www.w3.org/2000/svg'><rect width='16' height='16' rx='2'/></svg><span style='color: white;' id='area_area_" + area_length + "'>0 cm<sup>2</sup></span></div>");
    var index = area_length - 1;
    while (index > 0) {
        document.getElementById('area_info_' + index).style.display = 'none';
        index--;
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    initializeVariables();
});
function area_panel_clicked(event) {
    var index = 1;
    while (index <= area_length) {
        if (index == event.innerText) {
            document.getElementById('area_info_' + index).style.display = 'block';
        } else {
            document.getElementById('area_info_' + index).style.display = 'none';
        }
        index++;
    }
}

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
document.getElementById('line_tool').addEventListener('click', function (e) {
    document.getElementById('line_tool_card').style.display = 'block';
    document.getElementById('magic_wand_tool_card').style.display = 'none';
});
document.getElementById('magic_wand_tool').addEventListener('click', function (e) {
    document.getElementById('line_tool_card').style.display = 'none';
    document.getElementById('magic_wand_tool_card').style.display = 'block';
});
document.getElementById('pen_tool').addEventListener('click', function (e) {
    document.getElementById('line_tool_card').style.display = 'none';
    document.getElementById('magic_wand_tool_card').style.display = 'none';
    selected_tool = 'pen_tool';
    scene.style.zIndex = 2;
});
document.getElementById('mouse_pointer_tool').addEventListener('click', function(e) {
    document.getElementById('line_tool_card').style.display = 'none';
    document.getElementById('magic_wand_tool_card').style.display = 'none';
    selected_tool = "mouse_pointer_tool";
});
document.getElementById('zoom_in_tool').addEventListener('click', function(e) {
    document.getElementById('line_tool_card').style.display = 'none';
    document.getElementById('magic_wand_tool_card').style.display = 'none';
    selected_tool = "zoom_in_tool";
    zoom(1.1);
    zoom_scale *= 1.1;
    gridLine(zoom_scale);
});
document.getElementById('zoom_out_tool').addEventListener('click', function(e) {
    document.getElementById('line_tool_card').style.display = 'none';
    document.getElementById('magic_wand_tool_card').style.display = 'none';
    selected_tool = "zoom_out_tool";
    zoom(0.9);
    zoom_scale *= .9;
    gridLine(zoom_scale);
});
document.getElementById('hand_tool').addEventListener('click', function(e) {
    document.getElementById('line_tool_card').style.display = 'none';
    document.getElementById('magic_wand_tool_card').style.display = 'none';
    selected_tool = "hand_tool";
});
document.getElementById('undo_tool').addEventListener('click', function(e) {
    document.getElementById('line_tool_card').style.display = 'none';
    document.getElementById('magic_wand_tool_card').style.display = 'none';
    selected_tool = "undo_tool";
});
document.getElementById('redo_tool').addEventListener('click', function(e) {
    document.getElementById('line_tool_card').style.display = 'none';
    document.getElementById('magic_wand_tool_card').style.display = 'none';
    selected_tool = "redo_tool";
});
document.getElementById('sms_tool').addEventListener('click', function(e) {
    document.getElementById('line_tool_card').style.display = 'none';
    document.getElementById('magic_wand_tool_card').style.display = 'none';
    selected_tool = "sms_tool";
});

// line tool card selection.
document.getElementById('line_tool_line').addEventListener('click', function() {
    initializeVariables();
    selected_tool = 'line_tool_line';
    document.getElementById('line_tool_card').style.display = 'none';
    scene.style.zIndex = 2;
});
document.getElementById('line_tool_rectangle').addEventListener('click', function() {
    initializeVariables();
    selected_tool = 'line_tool_rectangle';
    document.getElementById('line_tool_card').style.display = 'none';
    scene.style.zIndex = 2;
});
document.getElementById('line_tool_circle').addEventListener('click', function() {
    initializeVariables();
    selected_tool = 'line_tool_circle';
    document.getElementById('line_tool_card').style.display = 'none';
    scene.style.zIndex = 2;
});

// magic wand tool card selection
document.getElementById('magic_wand_tool_magic').addEventListener('click', function() {
    selected_tool = 'magic_wand_tool_magic';
    document.getElementById('magic_wand_tool_card').style.display = 'none';
    scene.style.zIndex = 12;
});
document.getElementById('magic_wand_tool_add').addEventListener('click', function() {
    selected_tool = 'magic_wand_tool_add';
    document.getElementById('magic_wand_tool_card').style.display = 'none';
});
document.getElementById('magic_wand_tool_subtract').addEventListener('click', function() {
    selected_tool = 'magic_wand_tool_subtract';
    document.getElementById('magic_wand_tool_card').style.display = 'none';
});

// mouse events to canvas
canvas.addEventListener('mouseup', mouseUp);
canvas.addEventListener('mousedown', mouseDown);
canvas.addEventListener('mousemove', mouseMove);
canvas.addEventListener('mousewheel', mouseWheel);
// mouse events to scene(background canvas)
scene.addEventListener('mouseup', sceneMouseUp);
scene.addEventListener('mousedown', sceneMouseDown);
scene.addEventListener('mousemove', sceneMouseMove);

var readURL = function(input) {
    filename = input.files[0].name;
    if (input.files && input.files[0]) {
        var reader = new FileReader();
        reader.onload = function (e) {
            sceneCtx.clearRect(0, 0, sceneCtx.width, sceneCtx.height);
            img.src = e.target.result;
            tempWidth = img.width;
            tempHeight = img.height;
            setTimeout(() => {
                // sceneCtx.drawImage(image, (canvas.width - img.width) / 2, (canvas.height - img.height) / 2, img.width, img.height);
                sceneCtx.drawImage(img, (canvas.width - tempWidth) / 2, (canvas.height - tempHeight) / 2, tempWidth, tempHeight);

                imageInfo = {
                    width: img.width,
                    height: img.height,
                    context: sceneCtx
                };

                var tempCtx = document.createElement("canvas").getContext("2d");
                tempCtx.canvas.width = window.innerWidth;
                tempCtx.canvas.height = window.innerHeight;
                tempCtx.drawImage(img, (canvas.width - img.width), (canvas.height - img.height));
                imageInfo.data = tempCtx.getImageData((canvas.width - img.width), (canvas.height - img.height), imageInfo.width, imageInfo.height);
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
    t = ( s2_x * (p0['y'] - p2['y']) - s2_y * (p0['x'] - p2['x'])) / (-s2_x * s1_y + s1_x * s2_y);
    if (s >= 0 && s <= 1 && t >= 0 && t <= 1)
    {
        // Collision detected
        return true;
    }
    return false; // No collision
}

// make square around every single point
function point(x, y){
    ctx.fillStyle="red";
    ctx.strokeStyle = "red";
    ctx.fillRect(x-3, y-3, 6, 6);
    ctx.moveTo(x,y);
}

function draw(end){
    ctx.lineWidth = 1;
    ctx.strokeStyle = "white";
    ctx.lineCap = "square";
    ctx.beginPath();

    for (var i = 0; i < perimeter.length; i++){
        if (i == 0){
            ctx.moveTo(perimeter[i]['x'],perimeter[i]['y']);
            end || point(perimeter[i]['x'],perimeter[i]['y']);
        } else {
            ctx.lineTo(perimeter[i]['x'],perimeter[i]['y']);
            end || point(perimeter[i]['x'],perimeter[i]['y']);
        }
    }
    if (end){
        ctx.lineTo(perimeter[0]['x'],perimeter[0]['y']);
        ctx.closePath();
        ctx.fillStyle = 'rgba(255, 0, 0, 0.5)';
        ctx.fill();
        ctx.strokeStyle = 'blue';
        complete = true;
    }
    ctx.stroke();
}

function check_intersect(x,y){
    if(perimeter.length < 4){
        return false;
    }
    var p0 = new Array();
    var p1 = new Array();
    var p2 = new Array();
    var p3 = new Array();
    p2['x'] = perimeter[perimeter.length-1]['x'];
    p2['y'] = perimeter[perimeter.length-1]['y'];
    p3['x'] = x;
    p3['y'] = y;
    for(var i=0; i<perimeter.length-1; i++){
        p0['x'] = perimeter[i]['x'];
        p0['y'] = perimeter[i]['y'];
        p1['x'] = perimeter[i+1]['x'];
        p1['y'] = perimeter[i+1]['y'];
        if(p1['x'] == p2['x'] && p1['y'] == p2['y']){ continue; }
        if(p0['x'] == p3['x'] && p0['y'] == p3['y']){ continue; }
        if(line_intersects(p0, p1, p2, p3) == true){
            return true;
        }
    }
    return false;
}

function drawRecCircle(x1, y1, x2, y2) {
    if (selected_tool === 'line_tool_rectangle') {
        ctx.beginPath();
        ctx.rect(x, y, x1 - x, y1 - y);
        ctx.fillStyle = 'rgba(255, 0, 0, 0.5)';
        ctx.fill();
    } else if (selected_tool === 'line_tool_circle') {
        var radiusX = (x2 - x1) * 0.5,   // radius for x based on input
        radiusY = (y2 - y1) * 0.5,   // radius for y based on input
        centerX = x1 + radiusX,      // calc center
        centerY = y1 + radiusY,
        step = 0.01,                 // resolution of ellipse
        a = step,                    // counter
        pi2 = Math.PI * 2 - step;    // end angle
    
        // start a new path
        ctx.beginPath();
        // set start point at angle 0
        ctx.moveTo(centerX + radiusX * Math.cos(0),
                centerY + radiusY * Math.sin(0));
        // create the ellipse    
        for(; a < pi2; a += step) {
            ctx.lineTo(centerX + radiusX * Math.cos(a),
                    centerY + radiusY * Math.sin(a));
        }
        // close it and stroke it for demo
        // ctx.closePath();
        ctx.strokeStyle = '#FF0000';
        ctx.stroke();
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

// created by rjh: move the point of [id] to the coordinate (x,y)
function while_pt_Move(ev) {
    perimeter[selected_vertex_id]['x'] = ev.clientX;
    perimeter[selected_vertex_id]['y'] = ev.clientY;
    if (check_intersect(ev.clientX, ev.clientY)) {
        console.log("ERROR");
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    draw(true);
    perimeter.forEach(element => {
        point(element['x'], element['y']);
    });
    document.getElementById('area_perimeter_' + area_length).innerHTML = calc_area_perimeter(perimeter).perimeter + ' cm';
    document.getElementById('area_area_' + area_length).innerHTML = calc_area_perimeter(perimeter).area + ' cm<sup>2</sup>';
}

// created by rjh: calculate the area using the array of vertex coordinates ({ 'x': x, 'y': y }) not applicable to intersected polygon
function calc_area_perimeter(coordsarray) {
    var area = 0;
    var perimeter_length = 0;
    var tmp = new Array();
    coordsarray.forEach(elem => tmp.push(elem));
    tmp.push(coordsarray[0]);
    var id = 0;
    while (id < tmp.length - 1) {
        area += (tmp[id]['x'] / zoom_scale * tmp[id + 1]['y'] / zoom_scale - tmp[id + 1]['x'] / zoom_scale * tmp[id]['y'] / zoom_scale);
        if (id != tmp.length - 1) {
            perimeter_length += Math.sqrt(
                (tmp[id]['x'] / zoom_scale - tmp[id + 1]['x'] / zoom_scale)
                * (tmp[id]['x'] / zoom_scale - tmp[id + 1]['x'] / zoom_scale)
                + (tmp[id]['y'] / zoom_scale - tmp[id + 1]['y'] / zoom_scale)
                * (tmp[id]['y'] / zoom_scale - tmp[id + 1]['y'] / zoom_scale));
        }
        id += 1;
    }
    var result = { 'area': Math.abs(area / 2).toFixed(2), 'perimeter': perimeter_length.toFixed(2) };
    return result;
}

function mouseDown(event) {
    document.getElementById('line_tool_card').style.display = 'none';
    document.getElementById('magic_wand_tool_card').style.display = 'none';
    switch (selected_tool) {
        case 'line_tool_line': 
            if(complete){
                var x1 = event.clientX;
                var y1 = event.clientY;
                var id = check_perimeter_pt_clicked(x1, y1, perimeter)
                if (id != -1) {      // clicked
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
            
            if(event.button === 2){
                if(perimeter.length == 2){
                    alert('You need at least three points for a polygon');
                    return false;
                }
                x = perimeter[0]['x'];
                y = perimeter[0]['y'];
                if(check_intersect(x,y)){
                    alert('The line you are drowing intersect another line');
                    return false;
                }
                draw(true);
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
                            alert('The line you are drowing intersect another line');
                            return false;
                        }
                        draw(true);
                        document.getElementById('area_perimeter_' + area_length).innerHTML = calc_area_perimeter(perimeter).perimeter + ' cm';
                        document.getElementById('area_area_' + area_length).innerHTML = calc_area_perimeter(perimeter).area + ' cm<sup>2</sup>';
                        event.preventDefault();
                        return false;
                    }
                }
                if (perimeter.length > 0 && x == perimeter[perimeter.length-1]['x'] && y == perimeter[perimeter.length-1]['y']){
                    // same point - double click
                    return false;
                }
                if(check_intersect(x,y)){
                    alert('The line you are drowing intersect another line');
                    return false;
                }
                perimeter.push({'x':x, 'y':y});
                draw(false);
                return false;
            }
            break;
        case 'line_tool_rectangle':
            if(complete){
                var x1 = event.clientX;
                var y1 = event.clientY;
                var id = check_perimeter_pt_clicked(x1, y1, perimeter)
                if (id != -1) {      // clicked
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
            ctx.beginPath();
            x = event.clientX - rect.left;
            y = event.clientY - rect.top;
            ctx.moveTo(x, y);
            isDown = true;
            break;
        case 'hand_tool':
            var mouseX = event.pageX - this.offsetLeft;
            var mouseY = event.pageY - this.offsetTop;
            if (mouseX >= (currentX - tempWidth/2) &&
                mouseX <= (currentX + tempWidth/2) &&
                mouseY >= (currentY - tempHeight/2) &&
                mouseY <= (currentY + tempHeight/2)) {
              isDraggable = true;
            }
            canvas.style.cursor = "move";
            break
        case 'zoom_in_tool':
            zoom(1.1);
            zoom_scale *= 1.1;
            gridLine(zoom_scale);
            canvas.style.cursor = "zoom-in";
            break;
        case 'zoom_out_tool':
            zoom(0.9);
            zoom_scale *= 0.9;
            gridLine(zoom_scale);
            canvas.style.cursor = "zoom-out";
            break;
    }
}

function mouseUp(event) {
    switch (selected_tool) {
        case 'line_tool_rectangle':
            x1 = event.clientX - rect.left;
            y1 = event.clientY - rect.top;
            drawRecCircle(x, y, x1, y1);
            isDown = false;
            complete = true;
            break;
        case 'line_tool_circle':
            isDown = false;
            break;
        case 'pen_tool':
            isDown = false;
            break;
        case 'hand_tool':
            isDraggable = false;
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
            ctx.beginPath();
            ctx.rect(x, y, x1 - x, y1 - y);
            ctx.fillStyle = 'rgba(255, 0, 0, 0.5)';
            ctx.fill();
            ctx.closePath();
            point(x, y);
            point(x, y1);
            point(x1, y);
            point(x1, y1);
            perimeter = new Array();
            perimeter.push({ 'x': x, 'y': y });
            perimeter.push({ 'x': x, 'y': y1 });
            perimeter.push({ 'x': x1, 'y': y1 });
            perimeter.push({ 'x': x1, 'y': y });
            document.getElementById('area_perimeter_' + area_length).innerHTML = calc_area_perimeter(perimeter).perimeter + ' cm';
            document.getElementById('area_area_' + area_length).innerHTML = calc_area_perimeter(perimeter).area + ' cm<sup>2</sup>';
            break;
        case 'line_tool_circle':
            if (!isDown) return;
            x1 = event.clientX - rect.left;
            y1 = event.clientY - rect.top;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            drawRecCircle(x, y, x1, y1);
            break;
        case 'pen_tool':
            if (!isDown) return;
            x1 = event.clientX - rect.left;
            y1 = event.clientY - rect.top;
            ctx.lineTo(x1, y1);
            ctx.strokeStyle = '#FF0000';
            ctx.stroke();
            break
        case 'hand_tool':
            if (isDraggable) {
                currentX = event.pageX - this.offsetLeft;
                currentY = event.pageY - this.offsetTop;
            }
            drawImage();
            canvas.style.cursor = "move";
            break;
        case 'zoom_in_tool':
            canvas.style.cursor = "zoom-in";
            break;
        case 'zoom_out_tool':
            canvas.style.cursor = "zoom-out";
            break;
    }
}

function mouseWheel(e) {
    if (e.wheelDelta > 0) {
        zoom(1.1);
        zoom_scale *= 1.1;
        gridLine(zoom_scale);
    } else {
        zoom(.9);
        zoom_scale *= .9;
        gridLine(zoom_scale);
    }
}

function sceneMouseDown(e) {
    document.getElementById('line_tool_card').style.display = 'none';
    document.getElementById('magic_wand_tool_card').style.display = 'none';    
    if (selected_tool === 'magic_wand_tool_magic') {
        console.log(selected_tool);
        if (e.button == 0) {

            // appended by rjh:
            if (mask != null) {
                mask = null;
            }
            //
            allowDraw = true;
            downPoint = getMousePosition(e);
            drawMask(downPoint.x, downPoint.y);
        } else allowDraw = false;
    }
}

function sceneMouseUp(event) {
    
}

function sceneMouseMove(event) {
    
}

function initializeVariables() {
    perimeter = new Array();
    complete = false;
    selected_tool = '';
}

function drawImage() {
    sceneCtx.clearRect(0, 0, canvas.width, canvas.height);
    sceneCtx.drawImage(img, currentX-(tempWidth/2), currentY-(tempHeight/2), tempWidth, tempHeight);
    gridLine(zoom_scale);
}

function zoom(scale){
    sceneCtx.clearRect(0, 0, canvas.width, canvas.height);
    tempWidth = tempWidth * scale;
    tempHeight = tempHeight*scale;
    sceneCtx.drawImage(img, currentX - tempWidth / 2, currentY - tempHeight / 2, tempWidth, tempHeight);
}

setInterval(function() { hatchTick(); }, 300);

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

    otherCtx.clearRect((canvas.width - img.width) / 2, (canvas.height - img.height) / 2, w, h);

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
    ctx.putImageData(imageInfo.data, (canvas.width - img.width) / 2, (canvas.height - img.height) / 2);
    otherCtx.putImageData(imgData, (canvas.width - img.width) / 2, (canvas.height - img.height) / 2);
    gridLine();
    console.log("area" + calc_area_perimeter(coordsarray));
    console.log(coordsarray);
}

function getMousePosition(e) {
    x = e.clientX - rect.left;
    y = e.clientY - rect.top;
    console.log(x, y);
    return {
        x: Math.floor(x - (canvas.width - img.width) / 2),
        y: Math.floor(y - (canvas.height - img.height) / 2)
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
    drawBorder();

};
