/* lut.js
* LUT handling object for the LUTCalc Web App.
* 31st December 2014
*
* LUTCalc generates 1D and 3D Lookup Tables (LUTs) for video cameras that shoot log gammas, 
* principally the Sony CineAlta line.
*
* By Ben Turley, http://turley.tv
* First License: GPLv2
* Github: https://github.com/cameramanben/LUTCalc
*/
function LUTs() {
	this.title = '';
	this.format = ''; // Currently just 'cube'
	this.d = 0; // 1D or 3D
	this.s = 1024; // Dimension - eg 1024 or 4096 for 1D, 17, 33 or 65 for 3D
	this.min = [0,0,0]; // Lowest input value
	this.max = [1,1,1]; // Highest input value
	this.C = [];
	this.rgbl = false;
}
LUTs.prototype.getSize = function() {
	return this.s;
}
LUTs.prototype.is1D = function() {
	if (this.d === 1) {
		return true;
	} else {
		return false;
	}
}
LUTs.prototype.is3D = function() {
	if (this.d === 3) {
		return true;
	} else {
		return false;
	}
}
LUTs.prototype.getDetails = function() {
	var out = {
			title: this.title,
			format: this.format,
			dims: this.d,
			s: this.s,
			min: this.min,
			max: this.max,
			rgbl: this.rgbl
		}
	if (this.d === 3 || this.C.length === 3) {
		out.C = [this.C[0].buffer,this.C[1].buffer,this.C[2].buffer];
	} else {
		out.C = [this.L];
	}
	return out;
}
LUTs.prototype.setDetails = function(d) {
	title: this.title = d.title;
	format: this.format = d.format;
	this.d = d.dims;
	this.s = d.s;
	this.min = d.min;
	this.max = d.max;
	if (d.C.length === 3) {
		this.addLUT(d.C[0],d.C[1],d.C[2]);
	} else {
		this.addLUT(d.C[0]);
	}
}
LUTs.prototype.setInfo = function(title, format, dimensions, size, min, max) {
	this.title = title;
	this.format = format;
	this.d = dimensions;
	this.s = size;
	this.min[0] = min[0];
	this.min[1] = min[1];
	this.min[2] = min[2];
	this.max[0] = max[0];
	this.max[1] = max[1];
	this.max[2] = max[2];
}
LUTs.prototype.reset = function() {
	this.title = '';
	this.format = '';
	this.d = 1;
	this.s = 1024;
	this.min = [0,0,0];
	this.max = [1,1,1];
	this.C.length = 0;
	this.rgbl = false;
}
LUTs.prototype.addLUT = function(bufR,bufG,bufB) {
	if (this.d === 3 || ((typeof bufG !== 'undefined') && (typeof bufB !== 'undefined'))) {
		this.C = [	new Float64Array(bufR),
					new Float64Array(bufG),
					new Float64Array(bufB)];
		this.rgbl = true;
		this.buildL();
	} else {
		this.rgbl = false;
		this.L = new Float64Array(bufR);
	}
}
LUTs.prototype.buildL = function() { // 1D LUTs tend to be the same for each channel, but don't need to be. one time luma calculation to speed things up later
	this.L = new Float64Array(this.s);
	if (this.d === 3) {
		var k;
		for (var j=0; j<this.s; j++) {
			k = j + (this.s* (j + (this.s*j)));
			this.L[j] = (0.2126 * this.C[0][k]) + (0.7152 * this.C[1][k]) + (0.0722 * this.C[2][k]);
		}
	} else {
		for (var j=0; j<this.s; j++) {
			this.L[j] = (0.2126 * this.C[0][j]) + (0.7152 * this.C[1][j]) + (0.0722 * this.C[2][j]);
		}
	}
}
LUTs.prototype.getL = function() {
	return this.L.buffer;
}
LUTs.prototype.getRGB = function() {
	return [this.C[0].buffer,
			this.C[1].buffer,
			this.C[2].buffer];
}

LUTs.prototype.f = function(L) {
	return this.lumaLCub(L);
}
LUTs.prototype.lumaLCub = function(L) {
	var max = this.s - 1;
	L = L * max;
	if (L < 0) {
		var dy = ((4 * this.L[1]) - (3 * this.L[0]) - this.L[2])/2;
		return this.L[0] + (L * dy);
	} else if (L >= max) {
		var dy = (0.5 * this.L[max - 2]) - (2 * this.L[max - 1]) + (1.5 * this.L[max]);
		return this.L[max] + ((L - max) * dy);
	} else {
		var base = Math.floor(L);
		var p0 = this.L[base];
		var p1 = this.L[base + 1];
		var d0,d1;
		if (base == 0) {
			d0 = ((4 * this.L[1]) - (3 * this.L[0]) - this.L[2])/2;
		} else {
			d0 = (this.L[base + 1] - this.L[base - 1])/2;
		}
		if (base == max - 1) {
			d1 = (2 * this.L[max - 2]) + ((this.L[max - 1] - this.L[max - 3])/2) - (4 * this.L[max - 1]) + (2 * this.L[max]);
		} else {
			d1 = (this.L[base + 2] - this.L[base])/2;
		}
		var a = (2 * p0) + d0 - (2 * p1) + d1;
		var b = - (3 * p0) - (2 * d0) + (3 * p1) - d1;
		var c = d0;
		var d = p0;
		var l = L - base;
		return (a * (l * l * l)) + (b * (l * l)) + (c * l) + d;
	}
}
LUTs.prototype.lumaLLin = function(L) {
	var max = this.s - 1;
	L = L * max;
	if (L < 0) {
		var dy = ((4 * this.L[1]) - (3 * this.L[0]) - this.L[2])/2;
		return this.L[0] + (L * dy);
	} else if (L >= max) {
		var dy = (0.5 * this.L[max - 2]) - (2 * this.L[max - 1]) + (1.5 * this.L[max]);
		return this.L[max] + ((L - max) * dy);
	} else {
		var base = Math.floor(L);
		var dy = L - base;
		return (this.L[base] * (1 - dy)) + (this.L[base + 1] * dy); 
	}
}

LUTs.prototype.lumaRGBCub = function(L) {
	var max = this.s - 1;
	L = L * max;
	var out = new Float64Array(3);
	if (this.d === 1) {
		if (!this.rgbl) {
			if (L < 0) {
				var dy = ((4 * this.L[1]) - (3 * this.L[0]) - this.L[2])/2;
				out[0] = this.L[0] + (L * dy);
			} else if (L >= max) {
				var dy = (0.5 * this.L[max - 2]) - (2 * this.L[max - 1]) + (1.5 * this.L[max]);
				out[0] = this.L[max] + ((L - max) * dy);
			} else {
				var base = Math.floor(L);
				var p0 = this.L[base];
				var p1 = this.L[base + 1];
				var d0,d1;
				if (base == 0) {
					d0 = ((4 * this.L[1]) - (3 * this.L[0]) - this.L[2])/2;
				} else {
					d0 = (this.L[base + 1] - this.L[base - 1])/2;
				}
				if (base == max - 1) {
					d1 = (2 * this.L[max - 2]) + ((this.L[max - 1] - this.L[max - 3])/2) - (4 * this.L[max - 1]) + (2 * this.L[max]);
				} else {
					d1 = (this.L[base + 2] - this.L[base])/2;
				}
				var a = (2 * p0) + d0 - (2 * p1) + d1;
				var b = - (3 * p0) - (2 * d0) + (3 * p1) - d1;
				var c = d0;
				var d = p0;
				var l = L - base;
				out[0] = (a * (l * l * l)) + (b * (l * l)) + (c * l) + d;
			}
			out[1] = out[0];
			out[2] = out[0];
			return out;
		} else {
			var C;
			for (var j = 0; j < 3; j++) {
				C = this.C[j];
				if (L < 0) {
					var dy = ((4 * C[1]) - (3 * C[0]) - C[2])/2;
					out[j] = C[0] + (L * dy);
				} else if (L >= max) {
					var dy = (0.5 * C[max - 2]) - (2 * C[max - 1]) + (1.5 * C[max]);
					out[j] = C[max] + ((L - max) * dy);
				} else {
					var base = Math.floor(L);
					var p0 = C[base];
					var p1 = C[base + 1];
					var d0,d1;
					if (base == 0) {
						d0 = ((4 * C[1]) - (3 * C[0]) - C[2])/2;
					} else {
						d0 = (C[base + 1] - C[base - 1])/2;
					}
					if (base == max - 1) {
						d1 = (2 * C[max - 2]) + ((C[max - 1] - C[max - 3])/2) - (4 * C[max - 1]) + (2 * C[max]);
					} else {
						d1 = (C[base + 2] - C[base])/2;
					}
					var a = (2 * p0) + d0 - (2 * p1) + d1;
					var b = - (3 * p0) - (2 * d0) + (3 * p1) - d1;
					var c = d0;
					var d = p0;
					var l = L - base;
					out[j] = (a * (l * l * l)) + (b * (l * l)) + (c * l) + d;
				}
			}
			return out;
		}
	} else {
		var C;
		for (var j=0; j < 3; j++) {
			C = this.C[j];
			var s = this.s
			if (L < 0) {
				var dy = ((4 * C[1+(s*(1+s))]) - (3 * C[0]) - C[2+(s*(2+(s*2)))])/2;
				out[j] = C[0] + (L * dy);
			} else if (L >= max) {
				var dy = (0.5 * C[max-2+(s*(max-2+(s*(max-2))))]) - (2 * C[max-1+(s*(max-1+(s*(max-1))))]) + (1.5 * C[max+(s*(max+(s*max)))]);
				out[j] = C[max+(s*(max+(s*max)))] + ((L - max) * dy);
			} else {

				var base = Math.floor(L);
				var p0 = C[base+(s*(base+(s*base)))];
				var p1 = C[base+1+(s*(base+1+(s*(base+1))))];
				var d0,d1;
				if (base === 0) {
					d0 = ((4 * C[1+(s*(1+s))]) - (3 * C[0]) - C[2+(s*(2+(s*2)))])/2;
				} else {
					d0 = (C[base+1+(s*(base+1+(s*(base+1))))] - C[base-1+(s*(base-1+(s*(base-1))))])/2;
				}
				if (base === max - 1) {
					d1 = (2 * C[max-2+(s*(max-2+(s*(max-2))))]) + ((C[max-1+(s*(max-1+(s*(max-1))))] - C[max-3+(s*(max-3+(s*(max-3))))])/2) - (4 * C[max-1+(s*(max-1+(s*(max-1))))]) + (2 * C[max+(s*(max+(s*max)))]);
				} else {
					d1 = (C[base+2+(s*(base+2+(s*(base+2))))] - C[base+(s*(base+(s*base)))])/2;
				}
				var a = (2 * p0) + d0 - (2 * p1) + d1;
				var b = - (3 * p0) - (2 * d0) + (3 * p1) - d1;
				var c = d0;
				var d = p0;
				var l = L - base;
				out[j] = (a * (l * l * l)) + (b * (l * l)) + (c * l) + d;
			}
		}
		return out;
	}
}
LUTs.prototype.lumaRGBLin = function(L) {
	var max = this.s - 1;
	L = L * max;
	var out = new Float64Array(3);
	if (this.d === 1) {
		if (!this.rgbl) {
			if (L < 0) {
				var dy = ((4 * this.L[1]) - (3 * this.L[0]) - this.L[2])/2;
				out[0] = this.L[0] + (L * dy);
			} else if (L >= max) {
				var dy = (0.5 * this.L[max - 2]) - (2 * this.L[max - 1]) + (1.5 * this.L[max]);
				out[0] = this.L[max] + ((L - max) * dy);
			} else {
				var base = Math.floor(L);
				var dy = L - base;
				out[0] = (this.L[base] * (1 - dy)) + (this.L[base + 1] * dy);
			}
			out[1] = out[0];
			out[2] = out[0];
			return out;
		} else {
			var C;
			for (var j = 0; j < 3; j++) {
				C = this.C[j];
				if (L < 0) {
					var dy = ((4 * C[1]) - (3 * C[0]) - C[2])/2;
					out[j] = C[0] + (L * dy);
				} else if (L >= max) {
					var dy = (0.5 * C[max - 2]) - (2 * C[max - 1]) + (1.5 * C[max]);
					out[j] = C[max] + ((L - max) * dy);
				} else {
					var base = Math.floor(L);
					var dy = L - base;
					out[j] = (C[base] * (1 - dy)) + (C[base + 1] * dy);
				}
			}
			return out;
		}
	} else {
		var C;
		for (var j=0; j<3; j++) {
			C=this.C[j]
			if (L < 0) {
				var dy = ((4 * C[1+(s*(1+s))]) - (3 * C[0]) - C[2+(s*(2+(s*2)))])/2;
				out[j] = C[0] + (L * dy);
			} else if (L >= max) {
				var dy = (0.5 * C[max-2+(s*(max-2+(s*(max-2))))]) - (2 * C[max-1+(s*(max-1+(s*(max-1))))]) + (1.5 * C[max+(s*(max+(s*max)))]);
				out[j] = C[max+(s*(max+(s*max)))] + ((L - max) * dy);
			} else {
				var base = Math.floor(L);
				var dy = L - base;
				out[j] = (C[base+(s*(base+(s*base)))] * (1 - dy)) + (C[base+1+(s*(base+1+(s*(base+1))))] * dy);
			}
		}
		return out;
	}
}

LUTs.prototype.rgbLCub = function(rgb) {
	// Let rgbRGBCub sort things out then just calculate Lout using Rec709 coefficients
	var out = this.rgbRGBCub(rgb);
	return (0.2126*out[0]) + (0.7152*out[1]) + (0.0722*out[2]);
}
LUTs.prototype.rgbLLin = function(rgb) {
	// Let rgbRGBLin sort things out then just calculate Lout using Rec709 coefficients
	var out = this.rgbRGBLin(rgb);
	return (0.2126*out[0]) + (0.7152*out[1]) + (0.0722*out[2]);
}

LUTs.prototype.rgbRGBCub = function(rgb) {
	var out = new Float64Array(3);
	// 1D case where R,G & B have the same gammas
	if (this.d === 1 && !this.rgbl) {
		out[0] = this.lumaLCub(rgb[0]);
		out[1] = this.lumaLCub(rgb[1]);
		out[2] = this.lumaLCub(rgb[2]);
		return out;
	// Generalised 1D case (R, G & B can have differing gammas
	} else if (this.d == 1) {
		var max = this.s - 1;
		// Loop through each ouput colour channel in turn
		var C;
		for (var j=0; j<3; j++) {
			C = this.C[j];
			// Scale basic luma (0-1.0) range to array dimension
			var l = rgb[j] * max;
			// If current luma < 0, calculate gradient as the gradient at 0 of a quadratic fitting the bottom three points in the array
			// Then linearly scale from the array's 0 value
			if (l < 0) {
				var dy = ((4 * C[1]) - (3 * C[0]) - C[2])/2;
				out[j] = C[0] + (l * dy);
			// If current luma > 1, calculate gradient as the gradient at 1 of a quadratic fitting the top three points in the array
			// Then linearly scale from the array's last value
			} else if (l >= max) {
				var dy = (0.5 * C[max - 2]) - (2 * C[max - 1]) + (1.5 * C[max]);
				out[i] = C[max] + ((l - max) * dy);
			// Otherwise, cubic interpolate the output value from the LUT array
			} else {
				var base = Math.floor(l);
				var p0 = C[base];
				var p1 = C[base + 1];
				var d0,d1;
				// First and last gradients calculated fitting three points to quadratics
				if (base == 0) {
					d0 = ((4 * C[1]) - (3 * C[0]) - C[2])/2;
				} else {
					d0 = (C[base + 1] - C[base - 1])/2;
				}
				if (base == max - 1) {
					d1 = (2 * C[max - 2]) + ((C[max - 1] - C[max - 3])/2) - (4 * C[max - 1]) + (2 * C[max]);
				} else {
					d1 = (C[base + 2] - C[base])/2;
				}
				// Cubic polynomial - f(x) - parameters from known f(0), f'(0), f(1), f'(1)
				var a = (2 * p0) + d0 - (2 * p1) + d1;
				var b = - (3 * p0) - (2 * d0) + (3 * p1) - d1;
				var c = d0;
				var d = p0;
				l = l - base;
				// Basic cubic polynomial calculation
				out[j] = (a * (l * l * l)) + (b * (l * l)) + (c * l) + d;
			}
		}
		return out;
	} else {
		var max = this.s - 1;
		var input = [];
		var clip = max * 0.999999999999;
		var rL = false;
		var gL = false;
		var bL = false;
		var rH = false;
		var gH = false;
		var bH = false;
		// Scale basic RGB (0-1.0) range to array dimension
		input[0] = rgb[0] * max;
		input[1] = rgb[1] * max;
		input[2] = rgb[2] * max;
		// If 0 > input >= 1 for a colour channel, clip it (to a tiny fraction below 1 in the case of the upper limit)
		if (input[0] < 0) {
			input[0] = 0;
			rL = true;
		} else if (input [0] >= max) {
			input[0] = clip;
			rH = true;
		}
		if (input[1] < 0) {
			input[1] = 0;
			gL = true;
		} else if (input [1] >= max) {
			input[1] = clip;
			gH = true;
		}
		if (input[2] < 0) {
			input[2] = 0;
			bL = true;
		} else if (input [2] >= max) {
			input[2] = clip;
			bH = true;
		}
		// Now get tricubic interpolated value from prepared input values
		out[0] = this.triCubic(this.C[0], max, input);
		out[1] = this.triCubic(this.C[1], max, input);
		out[2] = this.triCubic(this.C[2], max, input);
		// If any of the input channels were clipped, replace their output value with linear extrapolation from the edge point
		if (rL) {
			var p0 = this.triCubic(this.C[0], max, [0,input[1],input[2]]);
			var p1 = this.triCubic(this.C[0], max, [1,input[1],input[2]]);
			var p2 = this.triCubic(this.C[0], max, [2,input[1],input[2]]);
			var dy = ((4 * p1) - (3 * p0) - p2)/2;
			out[0] = p0 + (rgb[0] * max * dy);
		} else if (rH) {
			var p0 = this.triCubic(this.C[0], max, [clip - 2,input[1],input[2]]);
			var p1 = this.triCubic(this.C[0], max, [clip - 1,input[1],input[2]]);
			var p2 = this.triCubic(this.C[0], max, [clip,input[1],input[2]]);
			var dy = (0.5 * p0) - (2 * p1) + (1.5 * p2);
			out[0] = p2 + ((rgb[0] - 1) * max * dy);
		}
		if (gL) {
			var p0 = this.triCubic(this.C[1], max, [input[0],0,input[2]]);
			var p1 = this.triCubic(this.C[1], max, [input[0],1,input[2]]);
			var p2 = this.triCubic(this.C[1], max, [input[0],2,input[2]]);
			var dy = ((4 * p1) - (3 * p0) - p2)/2;
			out[1] = p0 + (rgb[1] * max * dy);
		} else if (gH) {
			var p0 = this.triCubic(this.C[1], max, [input[0],clip - 2,input[2]]);
			var p1 = this.triCubic(this.C[1], max, [input[0],clip - 1,input[2]]);
			var p2 = this.triCubic(this.C[1], max, [input[0],clip,input[2]]);
			var dy = (0.5 * p0) - (2 * p1) + (1.5 * p2);
			out[1] = p2 + ((rgb[1] - 1) * max * dy);
		}
		if (bL) {
			var p0 = this.triCubic(this.C[2], max, [input[0],input[1],0]);
			var p1 = this.triCubic(this.C[2], max, [input[0],input[1],1]);
			var p2 = this.triCubic(this.C[2], max, [input[0],input[1],2]);
			var dy = ((4 * p1) - (3 * p0) - p2)/2;
			out[2] = p0 + (rgb[2] * max * dy);
		} else if (bH) {
			var p0 = this.triCubic(this.C[2], max, [input[0],input[1],clip - 2]);
			var p1 = this.triCubic(this.C[2], max, [input[0],input[1],clip - 1]);
			var p2 = this.triCubic(this.C[2], max, [input[0],input[1],clip]);
			var dy = (0.5 * p0) - (2 * p1) + (1.5 * p2);
			out[2] = p2 + ((rgb[2] - 1) * max * dy);
		}
		// Return the calculated value
		return out;
	}
}
LUTs.prototype.rgbRGBLin = function(input) {
	var out = new Float64Array(3);
	// 1D case where R,G & B have the same gammas
	if (this.d === 1 && !this.rgbl) {
		out[0] = this.lumaLLin(rgb[0]);
		out[1] = this.lumaLLin(rgb[1]);
		out[2] = this.lumaLLin(rgb[2]);
		return out;
	// Generalised 1D case (R, G & B can have differing gammas
	} else if (this.d == 1) {
		var max = this.s - 1;
		// Loop through each ouput colour channel in turn
		var C;
		for (var j=0; j<3; j++) {
			C=this.C[j];
			// Scale basic luma (0-1.0) range to array dimension
			var l = rgb[j] * max;
			// If current luma < 0, calculate gradient as the gradient at 0 of a quadratic fitting the bottom three points in the array
			// Then linearly scale from the array's 0 value
			if (l < 0) {
				var dy = ((4 * C[1]) - (3 * C[0]) - C[2])/2;
				out[j] = C[0] + (l * dy);
			// If current luma > 1, calculate gradient as the gradient at 1 of a quadratic fitting the top three points in the array
			// Then linearly scale from the array's last value
			} else if (l >= max) {
				var dy = (0.5 * C[max - 2]) - (2 * C[max - 1]) + (1.5 * C[max]);
				out[i] = C[max] + ((l - max) * dy);
			// Otherwise, cubic interpolate the output value from the LUT array
			} else {
				var base = Math.floor(l);
				var dy = l - base;
				out[i] = (C[base] * (1 - dy)) + (C[base + 1] * dy);
			}
		}
		return out;
	} else {
		var max = this.s - 1;
		var input = [];
		var clip = max * 0.999999999999;
		var rL = false;
		var gL = false;
		var bL = false;
		var rH = false;
		var gH = false;
		var bH = false;
		// Scale basic RGB (0-1.0) range to array dimension
		input[0] = rgb[0] * max;
		input[1] = rgb[1] * max;
		input[2] = rgb[2] * max;
		// If 0 > input >= 1 for a colour channel, clip it (to a tiny fraction below 1 in the case of the upper limit)
		if (input[0] < 0) {
			input[0] = 0;
			rL = true;
		} else if (input [0] >= max) {
			input[0] = clip;
			rH = true;
		}
		if (input[1] < 0) {
			input[1] = 0;
			gL = true;
		} else if (input [1] >= max) {
			input[1] = clip;
			gH = true;
		}
		if (input[2] < 0) {
			input[2] = 0;
			bL = true;
		} else if (input [2] >= max) {
			input[2] = clip;
			bH = true;
		}
		// Now get tricubic interpolated value from prepared input values
		out[0] = this.triLin(this.C[0], max, input);
		out[1] = this.triLin(this.C[1], max, input);
		out[2] = this.triLin(this.C[2], max, input);
		// If any of the input channels were clipped, replace their output value with linear extrapolation from the edge point
		if (rL) {
			var p0 = this.triLin(this.C[0], max, [0,input[1],input[2]]);
			var p1 = this.triLin(this.C[0], max, [1,input[1],input[2]]);
			var p2 = this.triLin(this.C[0], max, [2,input[1],input[2]]);
			var dy = ((4 * p1) - (3 * p0) - p2)/2;
			out[0] = p0 + (rgb[0] * max * dy);
		} else if (rH) {
			var p0 = this.triLin(this.C[0], max, [clip - 2,input[1],input[2]]);
			var p1 = this.triLin(this.C[0], max, [clip - 1,input[1],input[2]]);
			var p2 = this.triLin(this.C[0], max, [clip,input[1],input[2]]);
			var dy = (0.5 * p0) - (2 * p1) + (1.5 * p2);
			out[0] = p2 + ((rgb[0] - 1) * max * dy);
		}
		if (gL) {
			var p0 = this.triLin(this.C[1], max, [input[0],0,input[2]]);
			var p1 = this.triLin(this.C[1], max, [input[0],1,input[2]]);
			var p2 = this.triLin(this.C[1], max, [input[0],2,input[2]]);
			var dy = ((4 * p1) - (3 * p0) - p2)/2;
			out[1] = p0 + (rgb[1] * max * dy);
		} else if (gH) {
			var p0 = this.triLin(this.C[1], max, [input[0],clip - 2,input[2]]);
			var p1 = this.triLin(this.C[1], max, [input[0],clip - 1,input[2]]);
			var p2 = this.triLin(this.C[1], max, [input[0],clip,input[2]]);
			var dy = (0.5 * p0) - (2 * p1) + (1.5 * p2);
			out[1] = p2 + ((rgb[1] - 1) * max * dy);
		}
		if (bL) {
			var p0 = this.triLin(this.C[2], max, [input[0],input[1],0]);
			var p1 = this.triLin(this.C[2], max, [input[0],input[1],1]);
			var p2 = this.triLin(this.C[2], max, [input[0],input[1],2]);
			var dy = ((4 * p1) - (3 * p0) - p2)/2;
			out[2] = p0 + (rgb[2] * max * dy);
		} else if (bH) {
			var p0 = this.triLin(this.C[2], max, [input[0],input[1],clip - 2]);
			var p1 = this.triLin(this.C[2], max, [input[0],input[1],clip - 1]);
			var p2 = this.triLin(this.C[2], max, [input[0],input[1],clip]);
			var dy = (0.5 * p0) - (2 * p1) + (1.5 * p2);
			out[2] = p2 + ((rgb[2] - 1) * max * dy);
		}
		// Return the calculated value
		return out;
	}
}

LUTs.prototype.triCubic = function(C, max, RGB) {
	var rB = Math.floor(RGB[0]);
	var r = RGB[0] - rB;
	var gB = Math.floor(RGB[1]);
	var g = RGB[1] - gB;
	var bB = Math.floor(RGB[2]);
	var bl = RGB[2] - bB;
// Array shorthand
	var s1 = this.s;
	var s2 = s1*s1;
	var o =  rB +(  gB  *s1)+(  bB  *s2);
// Initial Control Points
	var Pooo = C[o];
	var Proo = C[o+1];
	var Pogo = C[o+s1];
	var Prgo = C[o+1+s1];
	var Poob = C[o+s2];
	var Prob = C[o+1+s2];
	var Pogb = C[o+s1+s2];
	var Prgb = C[o+1+s1+s2];
// Slope along red axis at control points
	var rDooo, rDogo, rDoob, rDogb;
	var rDnoo, rDngo, rDnob, rDngb;
	if (rB === 0) {
		rDooo = ((4*C[o+1])			- (3*C[o])		- C[o+2])/2;
		rDogo = ((4*C[o+1+s1])		- (3*C[o+s1])	- C[o+2+s1])/2;
		rDoob = ((4*C[o+1+s2])		- (3*C[o+s2])	- C[o+2+s2])/2;
		rDogb = ((4*C[o+1+s1+s2])	- (3*C[o+s1+s2])- C[o+2+s1+s2])/2;
		rDnoo = rDooo;
		rDngo = rDogo;
		rDnob = rDoob;
		rDngb = rDogb;
	} else {
		rDooo = (Proo - C[o-1])/2;		
		rDogo = (Prgo - C[o-1+s1])/2;		
		rDoob = (Prob - C[o-1+s2])/2;		
		rDogb = (Prgb - C[o-1+s1+s2])/2;	
		if (rB == 1) {
			rDnoo = ((4*C[o])		- (3*C[o-1])		- C[o+1])/2;
			rDngo = ((4*C[o+s1])	- (3*C[o-1+s1])		- C[o+1+s1])/2;
			rDnob = ((4*C[o+s2])	- (3*C[o-1+s2])		- C[o+1+s2])/2;
			rDngb = ((4*C[o+s1+s2])	- (3*C[o-1+s1+s2])	- C[o+1+s1+s2])/2;
		} else {
			rDnoo = (Pooo - C[o-2])/2;		
			rDngo = (Pogo - C[o-2+s1])/2;		
			rDnob = (Poob - C[o-2+s2])/2;		
			rDngb = (Pogb - C[o-2+s1+s2])/2;	
		}	
	}
	var rDroo, rDrgo, rDrob, rDrgb;
	var rDpoo, rDpgo, rDpob, rDpgb;
	if (rB === max - 1) {
		rDroo = (2*C[o-1])			- (C[o-2]/2)		- (3.5*C[o])		+ (2*C[o+1]);
		rDrgo = (2*C[o-1+s1])		- (C[o-2+s1]/2)	- (3.5*C[o+s1])		+ (2*C[o+1+s1]);
		rDrob = (2*C[o-1+s2])		- (C[o-2+s2]/2)	- (3.5*C[o+s2])		+ (2*C[o+1+s2]);
		rDrgb = (2*C[o-1+s1+s2])	- (C[o-2+s1+s2]/2)	- (3.5*C[o+s1+s2])	+(2*C[o+1+s1+s2]);
		rDpoo = rDroo;
		rDpgo = rDrgo;
		rDpob = rDrob;
		rDpgb = rDrgb;
	} else {
		rDroo = (C[o+2] - Pooo)/2;
		rDrgo = (C[o+2+s1] - Pogo)/2;
		rDrob = (C[o+2+s2] - Poob)/2;
		rDrgb = (C[o+2+s1+s2] - Pogb)/2;
		if (rB === max - 2) {
			rDpoo = (2*C[o])		- (C[o-1]/2)		- (3.5*C[o+1])		+ (2*C[o+2]);
			rDpgo = (2*C[o+s1])		- (C[o-1+s1]/2)	- (3.5*C[o+1+s1])	+ (2*C[o+2+s1]);
			rDpob = (2*C[o+s2])		- (C[o-1+s2]/2)	- (3.5*C[o+1+s2])	+ (2*C[o+2+s2]);
			rDpgb = (2*C[o+s1+s2])	- (C[o-1+s1+s2]/2)	- (3.5*C[o+1+s1+s2])+ (2*C[o+2+s1+s2]);
		} else {
			rDpoo = (C[o+2] - Proo)/2;
			rDpgo = (C[o+2+s1] - Prgo)/2;
			rDpob = (C[o+2+s2] - Prob)/2;
			rDpgb = (C[o+2+s1+s2] - Prgb)/2;
		}
	}
// Slope along green axis at control points
	var gDooo, gDroo, gDoob, gDrob;
	var gDono, gDrno, gDonb, gDrnb;
	if (gB === 0) {
		gDooo = ((4*C[o+s1])		- (3*C[o])		- C[o+(2*s1)])/2;
		gDroo = ((4*C[o+1+s1])		- (3*C[o+1])	- C[o+1+(2*s1)])/2;
		gDoob = ((4*C[o+s1+s2])		- (3*C[o+s2])	- C[o+(2*s1)+s2])/2;
		gDrob = ((4*C[o+1+s1+s2])	- (3*C[o+1+s2])	- C[o+1+(2*s1)+s2])/2;
	} else {
		gDooo = (Pogo - C[o-s1])/2;
		gDroo = (Prgo - C[o+1-s1])/2;
		gDoob = (Pogb - C[o-s1+s2])/2;
		gDrob = (Prgb - C[o+1-s1+s2])/2;
		gDono = gDooo;
		gDrno = gDroo;
		gDonb = gDoob;
		gDrnb = gDrob;
		if (gB === 1) {
			gDono = ((4*C[o])		- (3*C[o-s1])		- C[o+s1])/2;
			gDrno = ((4*C[o+1])		- (3*C[o+1-s1])		- C[o+1+s1])/2;
			gDonb = ((4*C[o+s2])	- (3*C[o-s1+s2])	- C[o+s1+s2])/2;
			gDrnb = ((4*C[o+1+s2])	- (3*C[o+1-s1+s2])	- C[o+1+s1+s2])/2;
		} else {
			gDono = (Pooo - C[o-s1])/2;
			gDrno = (Proo - C[o+1-s1])/2;
			gDonb = (Poob - C[o-s1+s2])/2;
			gDrnb = (Prob - C[o+1-s1+s2])/2;
		}
	}
	var gDogo, gDrgo, gDogb, gDrgb;
	var gDopo, gDrpo, gDopb, gDrpb;
	if (gB === max - 1) {
		gDogo = (2*C[o-s1])		- (C[o-(2*s1)]/2)		- (3.5*C[o])		+ (2*C[o+s1]);
		gDrgo = (2*C[o+1-s1])	- (C[o+1-(2*s1)]/2)		- (3.5*C[o+1])		+ (2*C[o+1+s1]);
		gDogb = (2*C[o-s1+s2])	- (C[o-(2*s1)+s2]/2)	- (3.5*C[o+s2])		+ (2*C[o+s1+s2]);
		gDrgb = (2*C[o+1-s1+s2])- (C[o+1-(2*s1)+s2]/2)	- (3.5*C[o+1+s2])	+ (2*C[o+1+s1+s2]);
	} else {
		gDogo = (C[o+(2*s1)] - Pooo)/2;
		gDrgo = (C[o+1+(2*s1)] - Proo)/2;
		gDogb = (C[o+(2*s1)+s2] - Poob)/2;
		gDrgb = (C[o+1+(2*s1)+s2] - Prob)/2;
		gDopo = gDogo;
		gDrpo = gDrgo;
		gDopb = gDogb;
		gDrpb = gDrgb;
		if (gB === max - 2) {
			gDopo = (2*C[o])		- (C[o-s1]/2)		- (3.5*C[o+s1])			+ (2*C[o+(2*s1)]);
			gDrpo = (2*C[o+1])		- (C[o+1-s1]/2)		- (3.5*C[o+1+s1])		+ (2*C[o+1+(2*s1)]);
			gDopb = (2*C[o+s2])		- (C[o-s1+s2]/2)	- (3.5*C[o+s1+s2])		+ (2*C[o+(2*s1)+s2]);
			gDrpb = (2*C[o+1+s2])	- (C[o+1-s1+s2]/2)	- (3.5*C[o+1+s1+s2])	+ (2*C[o+1+(2*s1)+s2]);
		} else {
			gDopo = (C[o+(2*s1)] - Pogo)/2;
			gDrpo = (C[o+1+(2*s1)] - Prgo)/2;
			gDopb = (C[o+(2*s1)+s2] - Pogb)/2;
			gDrpb = (C[o+1+(2*s1)+s2] - Prgb)/2;
		}
	}
// Slope along blue axis at control points
	var bDooo, bDroo, bDogo, bDrgo;
	var bDoon, bDron, bDogn, bDrgn;
	if (bB === 0) {
		bDooo = ((4*C[o+s2])		- (3*C[o])		- C[o+(2*s2)])/2;
		bDroo = ((4*C[o+1+s2])		- (3*C[o+1])	- C[o+1+(2*s2)])/2;
		bDogo = ((4*C[o+s1+s2])		- (3*C[o+s1])	- C[o+s1+(2*s2)])/2;
		bDrgo = ((4*C[o+1+s1+s2])	- (3*C[o+1+s1])	- C[o+1+s1+(2*s2)])/2;
		bDoon = bDooo;
		bDron = bDroo;
		bDogn = bDogo;
		bDrgn = bDrgo;
	} else {
		bDooo = (Poob - C[o-s2])/2;
		bDroo = (Prob - C[o+1-s2])/2;
		bDogo = (Pogb - C[o+s1-s2])/2;
		bDrgo = (Prgb - C[o+1+s1-s2])/2;
		if (bB === 1) {
			bDoon = ((4*C[o])		- (3*C[o-s2])		- C[o+s2])/2;
			bDron = ((4*C[o+1])		- (3*C[o+1-s2])		- C[o+1+s2])/2;
			bDogn = ((4*C[o+s1])	- (3*C[o+s1-s2])	- C[o+s1+s2])/2;
			bDrgn = ((4*C[o+1+s1])	- (3*C[o+1+s1-s2])	- C[o+1+s1+s2])/2;
		} else {
			bDoon = (Pooo - C[o-s2])/2;
			bDron = (Proo - C[o+1-s2])/2;
			bDogn = (Pogo - C[o+s1-s2])/2;
			bDrgn = (Prgo - C[o+1+s1-s2])/2;
		}
	}
	var bDoob, bDrob, bDogb, bDrgb;
	var bDoop, bDrop, bDogp, bDrgp;
	if (bB === max - 1) {
		bDoob = (2*C[o-s2])		- (C[o-(2*s2)]/2)		- (3.5*C[o])		+ (2*C[o+s2]);
		bDrob = (2*C[o+1-s2])	- (C[o+1-(2*s2)]/2)		- (3.5*C[o+1])		+ (2*C[o+1+s2]);
		bDogb = (2*C[o+s1-s2])	- (C[o+s1-(2*s2)]/2)	- (3.5*C[o+s1])		+ (2*C[o+s1+s2]);
		bDrgb = (2*C[o+1+s1-s2])- (C[o+1+s1-(2*s2)]/2)	- (3.5*C[o+1+s1])	+ (2*C[o+1+s1+s2]);
		bDoop = bDoob;
		bDrop = bDrob;
		bDogp = bDogb;
		bDrgp = bDrgb;
	} else {
		bDoob = (C[o+(2*s2)] - Pooo)/2;
		bDrob = (C[o+1+(2*s2)] - Proo)/2;
		bDogb = (C[o+s1+(2*s2)] - Pogo)/2;
		bDrgb = (C[o+1+s1+(2*s2)] - Prgo)/2;
		if (bB === max - 2) {
			bDoop = (2*C[o])		- (C[o-s2]/2)		- (3.5*C[o+s2])		+ (2*C[o+(2*s2)]);
			bDrop = (2*C[o+1])		- (C[o+1-s2]/2)		- (3.5*C[o+1+s2])	+ (2*C[o+1+(2*s2)]);
			bDogp = (2*C[o+s1])		- (C[o+s1-s2]/2)	- (3.5*C[o+s1+s2])	+ (2*C[o+s1+(2*s2)]);
			bDrgp = (2*C[o+1+s1])	- (C[o+1+s1-s2]/2)	- (3.5*C[o+1+s1+s2])+ (2*C[o+1+s1+(2*s2)]);
		} else {
			bDoop = (C[o+(2*s2)] - Poob)/2;
			bDrop = (C[o+1+(2*s2)] - Prob)/2;
			bDogp = (C[o+s1+(2*s2)] - Pogb)/2;
			bDrgp = (C[o+1+s1+(2*s2)] - Prgb)/2;
		}
	}
// Polynomial coefficiants
	var a,b;
// First calculate four control points along red axis.
	a = (2 * Pooo) + rDooo - (2 * Proo) + rDroo;
	b = - (3 * Pooo) - (2 * rDooo) + (3 * Proo) - rDroo;
	var Poo = (a * r * r * r) + (b * r * r) + (rDooo * r) + Pooo; // Poo
	a = (2 * Pogo) + rDogo - (2 * Prgo) + rDrgo;
	b = - (3 * Pogo) - (2 * rDogo) + (3 * Prgo) - rDrgo;
	var Pgo = (a * r * r * r) + (b * r * r) + (rDogo * r) + Pogo; // Pgo
	a = (2 * Poob) + rDoob - (2 * Prob) + rDrob;
	b = - (3 * Poob) - (2 * rDoob) + (3 * Prob) - rDrob;
	var Pob = (a * r * r * r) + (b * r * r) + (rDoob * r) + Poob; // Pob
	a = (2 * Pogb) + rDogb - (2 * Prgb) + rDrgb;
	b = - (3 * Pogb) - (2 * rDogb) + (3 * Prgb) - rDrgb;
	var Pgb = (a * r * r * r) + (b * r * r) + (rDogb * r) + Pogb; // Pgb
// Now calculate slope along green axis at the new control points
	var gDnoo, gDngo, gDnob, gDngb;
	if (rB == 0) {
		gDnoo = gDooo;
		gDngo = gDogo;
		gDnob = gDoob;
		gDngb = gDogb;
	} else {
		if (gB === 0) {
			gDnoo = ((4*C[o-1+s1])		- (3*C[o-1])	- C[o-1+(2*s1)])/2;
			gDnob = ((4*C[o-1+s1+s2])	- (3*C[o-1+s2])	- C[o-1+(2*s1)+s2])/2;
		} else {
			gDnoo = (C[o-1+s1]		- C[o-1-s1])/2;
			gDnob = (C[o-1+s1+s2]	- C[o-1-s1+s2])/2;
		}
		if (gB === max - 1) {
			gDngo = (2*C[o-1-s1])	- (C[o-1-(2*s1)]/2)		- (3.5*C[o-1]) + (2*C[o-1+s1]);
			gDngb = (2*C[o-1-s1+s2])- (C[o-1-(2*s1)+s2]/2)	- (3.5*C[o-1+s2]) + (2*C[o-1+s1+s2]);
		} else {
			gDngo = (C[o-1+(2*s1)]		- C[o-1])/2;
			gDngb = (C[o-1+(2*s1)+s2]	- C[o-1+s2])/2;
		}
	}
	var gDpoo, gDpgo, gDpob, gDpgb;
	if (rB === max - 1) {
		gDpoo = gDroo;
		gDpgo = gDrgo;
		gDpob = gDrob;
		gDpgb = gDrgb;
	} else {
		if (gB === 0) {
			gDpoo = ((4*C[o+2+s1])		- (3*C[o+2])	- C[o+2+(2*s1)])/2;
			gDpob = ((4*C[o+2+s1+s2])	- (3*C[o+2+s2])	- C[o+2+(2*s1)+s2])/2;
		} else {
			gDpoo = (Prgo - C[o+2-s1])/2;
			gDpob = (Prgb - C[o+2-s1+s2])/2;
		}
		if (gB === max - 1) {
			gDpgo = (2*C[o+2-s1])	- (C[o+2-(2*s1)]/2)		- (3.5*C[o+2])		+ (2*C[o+2+s1]);
			gDpgb = (2*C[o+2-s1+s2])- (C[o+2-(2*s1)+s2]/2)	- (3.5*C[o+2+s2])	+ (2*C[o+2+s1+s2]);
		} else {
			gDpgo = (C[o+2+(2*s1)]		- C[o+2])/2;
			gDpgb = (C[o+2+(2*s1)+s2]	- C[o+2+s2])/2;
		}
	}
	var gDrDooo = (gDroo - gDnoo)/2;
	var gDrDroo = (gDpoo - gDooo)/2;
	var gDrDogo = (gDrgo - gDngo)/2;
	var gDrDrgo = (gDpgo - gDogo)/2;
	var gDrDoob = (gDrob - gDnob)/2;
	var gDrDrob = (gDpob - gDoob)/2;
	var gDrDogb = (gDrgb - gDngb)/2;
	var gDrDrgb = (gDpgb - gDogb)/2;
	a = (2 * gDooo) + gDrDooo - (2 * gDroo) + gDrDroo;
	b = - (3 * gDooo) - (2 * gDrDooo) + (3 * gDroo) - gDrDroo;
	var gDoo = (a * r * r * r) + (b * r * r) + (gDrDooo * r) + gDooo; // gDoo
	a = (2 * gDogo) + gDrDogo - (2 * gDrgo) + gDrDrgo;
	b = - (3 * gDogo) - (2 * gDrDogo) + (3 * gDrgo) - gDrDrgo;
	var gDgo = (a * r * r * r) + (b * r * r) + (gDrDogo * r) + gDogo; // gDgo
	a = (2 * gDoob) + gDrDoob - (2 * gDrob) + gDrDrob;
	b = - (3 * gDoob) - (2 * gDrDoob) + (3 * gDrob) - gDrDrob;
	var gDob = (a * r * r * r) + (b * r * r) + (gDrDoob * r) + gDoob; // gDob
	a = (2 * gDogb) + gDrDogb - (2 * gDrgb) + gDrDrgb;
	b = - (3 * gDogb) - (2 * gDrDogb) + (3 * gDrgb) - gDrDrgb;
	var gDgb = (a * r * r * r) + (b * r * r) + (gDrDogb * r) + gDogb; // gDgb
// Now calculate two control points along the green axis
	a = (2 * Poo) + gDoo - (2 * Pgo) + gDgo;
	b = - (3 * Poo) - (2 * gDoo) + (3 * Pgo) - gDgo;
	var Po = (a * g * g * g) + (b * g * g) + (gDoo * g) + Poo; // Po
	a = (2 * Pob) + gDob - (2 * Pgb) + gDgb;
	b = - (3 * Pob) - (2 * gDob) + (3 * Pgb) - gDgb;
	var Pb = (a * g * g * g) + (b * g * g) + (gDob * g) + Pob; // Pb
// Now find the slope along the blue axis at the four red axis calculated control points
	var bDnoo, bDngo, bDnob, bDngb;
	if (rB === 0) {
		bDnoo = bDooo;
		bDngo = bDogo;
		bDnob = bDoob;
		bDngb = bDogb;
	} else {
		if (bB === 0) {
			bDnoo = ((4*C[o-1+s2])		- (3*C[o-1])	- C[o-1+(2*s2)])/2;
			bDngo = ((4*C[o-1+s1+s2])	- (3*C[o-1+s1])	- C[o-1+s1+(2*s2)])/2;
		} else {
			bDnoo = (C[o-1+s2]		- C[o-1-s2])/2;
			bDngo = (C[o-1+s1+s2]	- C[o-1+s1-s2])/2;
		}
		if (bB === max - 1) {
			bDnob = (2*C[o-1-s2])	- (C[o-1-(2*s2)]/2)		- (3.5*C[o-1])		+ (2*C[o-1+s2]);
			bDngb = (2*C[o-1+s1-s2])- (C[o-1+s1-(2*s2)]/2)	- (3.5*C[o-1+s1])	+ (2*C[o-1+s1+s2]);
		} else {
			bDnob = (C[o-1+(2*s2)]		- C[o-1])/2;
			bDngb = (C[o-1+s1+(2*s2)]	- C[o-1+s1])/2;
		}
	}
	var bDpoo, bDpgo, bDpob, bDpgb;
	if (rB === max - 1) {
		bDpoo = bDroo;
		bDpgo = bDrgo;
		bDpob = bDrob;
		bDpgb = bDrgb;
	} else {
		if (bB === 0) {
			bDpoo = ((4*C[o+2+s2])		- (3*C[o+2])	- C[o+2+(2*s2)])/2;
			bDpgo = ((4*C[o+2+s1+s2])	- (3*C[o+2+s1])	- C[o+2+s1+(2*s2)])/2;
		} else {
			bDpoo = (C[o+2+s2]		- C[o+2-s2])/2;
			bDpgo = (C[o+2+s1+s2]	- C[o+2+s1-s2])/2;
		}
		if (bB === max - 1) {
			bDpob = (2*C[o+2-s2])	- (C[o+2-(2*s2)]/2)		- (3.5*C[o+2])		+ (2*C[o+2+s2]);
			bDpgb = (2*C[o+2+s1-s2])- (C[o+2+s1-(2*s2)]/2)	- (3.5*C[o+2+s1])	+ (2*C[o+2+s1+s2]);
		} else {
			bDpob = (C[o+2+(2*s2)]		- C[o+2])/2;
			bDpgb = (C[o+2+s1+(2*s2)]	- C[o+2+s1])/2;
		}
	}
	var bDrDooo = (bDroo - bDnoo)/2;
	var bDrDroo = (bDpoo - bDooo)/2;
	var bDrDogo = (bDrgo - bDngo)/2;
	var bDrDrgo = (bDpgo - bDogo)/2;
	var bDrDoob = (bDrob - bDnob)/2;
	var bDrDrob = (bDpob - bDoob)/2;
	var bDrDogb = (bDrgb - bDngb)/2;
	var bDrDrgb = (bDpgb - bDogb)/2;
	a = (2 * bDooo) + bDrDooo - (2 * bDroo) + bDrDroo;
	b = - (3 * bDooo) - (2 * bDrDooo) + (3 * bDroo) - bDrDroo;
	var bDoo = (a * r * r * r) + (b * r * r) + (bDrDooo * r) + bDooo; // bDoo
	a = (2 * bDogo) + bDrDogo - (2 * bDrgo) + bDrDrgo;
	b = - (3 * bDogo) - (2 * bDrDogo) + (3 * bDrgo) - bDrDrgo;
	var bDgo = (a * r * r * r) + (b * r * r) + (bDrDogo * r) + bDogo; // bDgo
	a = (2 * bDoob) + bDrDoob - (2 * bDrob) + bDrDrob;
	b = - (3 * bDoob) - (2 * bDrDoob) + (3 * bDrob) - bDrDrob;
	var bDob = (a * r * r * r) + (b * r * r) + (bDrDoob * r) + bDoob; // bDob
	a = (2 * bDogb) + bDrDogb - (2 * bDrgb) + bDrDrgb;
	b = - (3 * bDogb) - (2 * bDrDogb) + (3 * bDrgb) - bDrDrgb;
	var bDgb = (a * r * r * r) + (b * r * r) + (bDrDogb * r) + bDogb; // gDgb
// Now find the slope along the blue axis at eight notional green points (green = -1, green = +2) as was done for red points
	var bDono, bDrno, bDonb, bDrnb;
	if (gB === 0) {
		bDono = bDooo;
		bDrno = bDroo;
		bDonb = bDoob;
		bDrnb = bDrob;
	} else {
		if (bB === 0) {
			bDono = ((4*C[o-s1+s2])		- (3*C[o-s1]) - C[o-s1+(2*s2)])/2;
			bDrno = ((4*C[o+1-s1+s2])	- (3*C[o+1-s1]) - C[o+1-s1+(2*s2)])/2;
		} else {
			bDono = (C[o-s1+s2]		- C[o-s1-s2])/2;
			bDrno = (C[o+1-s1+s2]	- C[o+1-s1-s2])/2;
		}
		if (bB === max - 1) {
			bDonb = (2*C[o-s1-s2])	- (C[o-s1-(2*s2)]/2)	- (3.5*C[o-s1])		+ (2*C[o-s1+s2]);
			bDrnb = (2*C[o+1-s1-s2])- (C[o+1-s1-(2*s2)]/2)	- (3.5*C[o+1-s1])	+ (2*C[o+1-s1+s2]);
		} else {
			bDonb = (C[o-s1+(2*s2)]		- C[o-s1])/2;
			bDrnb = (C[o+1-s1+(2*s2)]	- C[o+1-s1])/2;
		}
	}
	var bDopo, bDrpo, bDopb, bDrpb;
	if (gB === max - 1) {
		bDopo = bDogo;
		bDrpo = bDrgo;
		bDopb = bDogb;
		bDrpb = bDrgb;
	} else {
		if (bB === 0) {
			bDopo = ((4*C[o+(2*s1)+s2])		- (3*C[o+(2*s1)]) - C[o+(2*s1)+(2*s2)])/2;
			bDrpo = ((4*C[o+1+(2*s1)+s2])	- (3*C[o+1+(2*s1)]) - C[o+1+(2*s1)+(2*s2)])/2;
		} else {
			bDopo = (C[o+(2*s1)+s2]		- C[o+(2*s1)-s2])/2;
			bDrpo = (C[o+1+(2*s1)+s2]	- C[o+1+(2*s1)-s2])/2;
		}
		if (bB === max - 1) {
			bDopb = (2*C[o+(2*s1)-s2])	- (C[o+(2*s1)-(2*s2)]/2)	- (3.5*C[o+(2*s1)])		+ (2*C[o+(2*s1)+s2]);
			bDrpb = (2*C[o+1+(2*s1)-s2])- (C[o+1+(2*s1)-(2*s2)]/2)	- (3.5*C[o+1+(2*s1)])	+ (2*C[o+1+(2*s1)+s2]);
		} else {
			bDopb = (C[o+(2*s1)+(2*s2)]		- C[o+(2*s1)])/2;
			bDrpb = (C[o+1+(2*s1)+(2*s2)]	- C[o+1+(2*s1)])/2;
		}
	}
// Now the blue axis slope at the eight notional corners
	var bDnno, bDnnb;
	if (rB === 0 || gB === 0) {
		bDnno = bDooo;
		bDnnb = bDoob;
	} else {
		if (bB === 0) {
			bDnno = ((4*C[o-1-s1+s2]) - (3*C[o-1-s1]) - C[o-1-s1+(2*s2)])/2;
		} else {
			bDnno = (C[o-1-s1+s2] - C[o-1-s1-s2])/2;
		}
		if (bB === max - 1) {
			bDnnb = (2*C[o-1-s1-s2]) - (C[o-1-s1-(2*s2)]/2) - (3.5*C[o-1-s1]) + (2*C[o-1-s1+s2]);
		} else {
			bDnnb = (C[o-1-s1+(2*s2)] - C[o-1-s1])/2;
		}
	}
	if (rB === 0 || gB === max - 1) {
		bDnpo = bDogo;
		bDnpb = bDogb;
	} else {
		if (bB === 0) {
			bDnpo = ((4*C[o-1+(2*s1)+s2]) - (3*C[o-1+(2*s1)]) - C[o-1+(2*s1)+(2*s2)])/2;
		} else {
			bDnpo = (C[o-1+(2*s1)+s2] - C[o-1+(2*s1)-s2])/2;
		}
		if (bB === max - 1) {
			bDnpb = (2*C[o-1+(2*s1)-s2]) - (C[o-1+(2*s1)-(2*s2)]/2) - (3.5*C[o-1+(2*s1)]) + (2*C[o-1+(2*s1)+s2]);
		} else {
			bDnpb = (C[o-1+(2*s1)+(2*s2)] - C[o-1+(2*s1)])/2;
		}
	}
	if (rB === max - 1 || gB === 0) {
		bDpno = bDroo;
		bDpnb = bDrob;
	} else {
		if (bB === 0) {
			bDpno = ((4*C[o+2-s1+s2]) - (3*C[o+2-s1]) - C[o+2-s1+(2*s2)])/2;
		} else {
			bDpno = (C[o+2-s1+s2] - C[o+2-s1-s2])/2;
		}
		if (bB === max - 1) {
			bDpnb = (2*C[o+2-s1-s2]) - (C[o+2-s1-(2*s2)]/2) - (3.5*C[o+2-s1]) + (2*C[o+2-s1+s2]);
		} else {
			bDpnb = (C[o+2-s1+(2*s2)] - C[o+2-s1])/2;
		}
	}
	if (rB === max - 1 || gB === max - 1) {
		bDppo = bDrgo;
		bDppb = bDrgb;
	} else {
		if (bB === 0) {
			bDppo = ((4*C[o+2+(2*s1)+s2]) - (3*C[o+2+(2*s1)]) - C[o+2+(2*s1)+(2*s2)])/2;
		} else {
			bDppo = (C[o+2+(2*s1)+s2] - C[o+2+(2*s1)-s2])/2;
		}
		if (bB === max - 1) {
			bDppb = (2*C[o+2+(2*s1)-s2]) - (C[o+2+(2*s1)-(2*s2)]/2) - (3.5*C[o+2+(2*s1)]) + (2*C[o+2+(2*s1)+s2]);
		} else {
			bDppb = (C[o+2+(2*s1)+(2*s2)] - C[o+2+(2*s1)])/2;
		}
	}
// Now get the blue slope control points along the red axis for calculating blue slope at green control points 8)
	var bDrDono = (bDrno - bDnno)/2;
	var bDrDrno = (bDpno - bDono)/2;
	var bDrDopo = (bDrpo - bDnpo)/2;
	var bDrDrpo = (bDppo - bDopo)/2;
	var bDrDonb = (bDrnb - bDnnb)/2;
	var bDrDrnb = (bDpnb - bDonb)/2;
	var bDrDopb = (bDrpb - bDnpb)/2;
	var bDrDrpb = (bDppb - bDopb)/2;
	a = (2 * bDono) + bDrDono - (2 * bDrno) + bDrDrno;
	b = - (3 * bDono) - (2 * bDrDono) + (3 * bDrno) - bDrDrno;
	var bDno = (a * r * r * r) + (b * r * r) + (bDrDono * r) + bDono; // bDno
	a = (2 * bDopo) + bDrDopo - (2 * bDrpo) + bDrDrpo;
	b = - (3 * bDopo) - (2 * bDrDopo) + (3 * bDrpo) - bDrDrpo;
	var bDpo = (a * r * r * r) + (b * r * r) + (bDrDopo * r) + bDopo; // bDpo
	a = (2 * bDonb) + bDrDonb - (2 * bDrnb) + bDrDrnb;
	b = - (3 * bDonb) - (2 * bDrDonb) + (3 * bDrnb) - bDrDrnb;
	var bDnb = (a * r * r * r) + (b * r * r) + (bDrDonb * r) + bDonb; // bDnb
	a = (2 * bDopb) + bDrDopb - (2 * bDrpb) + bDrDrpb;
	b = - (3 * bDopb) - (2 * bDrDopb) + (3 * bDrpb) - bDrDrpb;
	var bDpb = (a * r * r * r) + (b * r * r) + (bDrDogb * r) + bDopb; // gDpb
// Now calculate the blue slope at the two green control points
	var bDgDoo = (bDgo - bDno)/2;
	var bDgDgo = (bDpo - bDoo)/2;
	var bDgDob = (bDgb - bDnb)/2;
	var bDgDgb = (bDpb - bDob)/2;
	a = (2 * bDoo) + bDgDoo - (2 * bDgo) + bDgDgo;
	b = - (3 * bDoo) - (2 * bDgDoo) + (3 * bDgo) - bDgDgo;
	var bDo = (a * g * g * g) + (b * g * g) + (bDgDoo * g) + bDoo; // bDo
	a = (2 * bDob) + bDgDob - (2 * bDgb) + bDgDgb;
	b = - (3 * bDob) - (2 * bDgDob) + (3 * bDgb) - bDgDgb;
	var bDb = (a * g * g * g) + (b * g * g) + (bDgDob * g) + bDob; // bDb
// Finally we get to the point - literally !
	a = (2 * Po) + bDo - (2 * Pb) + bDb;
	b = - (3 * Po) - (2 * bDo) + (3 * Pb) - bDb;
	return ((a * bl * bl * bl) + (b * bl * bl) + (bDo * bl) + Po); // P
}
LUTs.prototype.triLin = function(C, max, RGB) {
	var rB = Math.floor(RGB[0]);
	var r = RGB[0] - rB;
	var gB = Math.floor(RGB[1]);
	var g = RGB[1] - gB;
	var bB = Math.floor(RGB[2]);
	var bl = RGB[2] - bB;
	var s1 = this.s;
	var s2 = s1*s1;
	var o =  rB +(  gB  *s1)+(  bB  *s2);
	var Pooo = C[o];
	var Proo = C[o+1];
	var Pogo = C[o+s1];
	var Prgo = C[o+1+s1];
	var Poob = C[o+s2];
	var Prob = C[o+1+s2];
	var Pogb = C[o+s1+s2];
	var Prgb = C[o+1+s1+s2];
	return	(((((Pooo*(1-r))+(Proo*r))*(1-g))+(((Pogo*(1-r))+(Prgo*r))*g))*(1-bl))+
			(((((Poob*(1-r))+(Prob*r))*(1-g))+(((Pogb*(1-r))+(Prgb*r))*g))*bl);
}
