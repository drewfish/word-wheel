// Game play.
var pangram = '';
var key_letter = '';
var all_words = [];
var found_words = [];
var entered_word = "";

// Style.
// The SVG inner dimensions are 1000x1000.
const letter_circle_radius = 100;
const letter_center_to_baseline = 0;
const wheel_radius = (1000 - letter_circle_radius - 200) / 2;
const svgNS = "http://www.w3.org/2000/svg";
const error_flash_ms = 500;

// Misc.
const nbsp = "\u00A0";
var error_timeout_id = 0;

// Override in local.js:
var puzzle_url = "cur-puzzle";
var logging_enabled = false;


function log(message) {
	if (!logging_enabled)
		return;

	console.log(message);
	}

function set_status(message) {
	if (!message)
		message = nbsp;
	document.getElementById("status").textContent = message;
	}


function handle_key(event) {
	if (!event)
		event = window.event;

	if (event.ctrlKey || event.altKey || event.metaKey)
		return;

	let handled = false;

	let key = event.keyCode;
	if (key == 0)
		key = event.which;
	key = String.fromCharCode(key).toLowerCase();

	// Any key will stop the error flash.
	if (error_timeout_id != 0) {
		clearTimeout(error_timeout_id);
		clear_word_error_indication();
		}

	if (key == "\b") {
		entered_word = entered_word.slice(0, entered_word.length - 1);
		let cur_word = document.getElementById("cur-word");
		if (entered_word.length == 0)
			cur_word.textContent = nbsp;
		else
			cur_word.textContent = entered_word;
		handled = true;
		}
	else if (key.length == 1 && key >= "a" && key <= "z") {
		let cur_word = document.getElementById("cur-word");
		entered_word += key;
		cur_word.textContent = entered_word;
		handled = true;
		}
	else if (key == "\r") {
		enter_word();
		handled = true;
		}

	if (handled) {
		event.preventDefault();
		event.stopPropagation();
		}
	}

function enter_word() {
	if (!all_words.includes(entered_word)) {
		indicate_word_error();
		}

	else if (found_words.includes(entered_word)) {
		build_found_words(true);
		clear_entered_word();
		}

	else {
		found_words.push(entered_word);
		found_words.sort();
		build_found_words(false);
		clear_entered_word();
		}
	}

function build_found_words(already_found) {
	// Clear existing words.
	let element = document.getElementById("found-words");
	while (element.firstChild)
		element.removeChild(element.firstChild);

	// Rebuild the words.
	let cur_string = "";
	function finish_cur_string() {
		if (cur_string.length > 0) {
			element.appendChild(document.createTextNode(cur_string));
			cur_string = "";
			}
		};
	let started = false;
	found_words.forEach(word => {
		if (started)
			cur_string += ", ";
		else
			started = true;
		if (word == entered_word) {
			finish_cur_string();
			let span = document.createElement("span");
			span.setAttribute("class", already_found ? "already-found" : "just-found");
			span.textContent = word;
			element.appendChild(span);
			}
		else
			cur_string += word;
		});
	finish_cur_string();

	// Show stats.
	document.getElementById("status").textContent =
		`Found ${found_words.length} out of ${all_words.length} words.`;
	}

function indicate_word_error() {
	document.getElementById("cur-word").setAttribute("error", "error");
	error_timeout_id = setTimeout(clear_word_error_indication, error_flash_ms);
	}

function clear_word_error_indication() {
	document.getElementById("cur-word").removeAttribute("error");
	clear_entered_word();
	build_found_words(false);
	error_timeout_id = 0;
	}

function clear_entered_word() {
	entered_word = "";
	document.getElementById("cur-word").textContent = nbsp;
	}

function get_puzzle() {
	try {
		log("Requesting: " + puzzle_url);
		let request = new XMLHttpRequest();
		request.open("GET", puzzle_url, true);
		request.onreadystatechange = function() {
			if (request.readyState == 4) {
				if (request.status == 200 && request.responseText) {
					start_puzzle(request.responseText);
					}
				else
					set_status("Getting the board failed: " + request.status);
				}
			};
		request.send(null);
		}
	catch (error) {
		alert("Couldn't get the puzzle!");
		}
	}

function scramble_word(word) {
	let scrambled_word = "";
	while (word.length > 0) {
		let index = Math.floor(Math.random() * word.length);
		scrambled_word += word[index];
		word = word.slice(0, index) + word.slice(index + 1);
		}
	return scrambled_word;
	}

function start_puzzle(text) {
	log("Got puzzle.");
	// Parse the puzzle.
	let lines = text.split('\n');
	[pangram, key_letter] = lines.shift().split(' ');
	all_words = lines.map(line => line.split(' ')[0]);

	// Start building the wheel.
	let wheel = document.getElementById("wheel");
	const [wheel_width, wheel_height] = [ 1000, 1000 ];
	function add_letter(letter, x, y) {
		// Circle.
		let circle = document.createElementNS(svgNS, 'circle');
		circle.setAttribute('class', 'letter-circle');
		circle.setAttribute('cx', x.toString());
		circle.setAttribute('cy', y.toString());
		circle.setAttribute('r', letter_circle_radius.toString());
		wheel.appendChild(circle);

		// Letter text.
		let text = document.createElementNS(svgNS, 'text');
		text.setAttribute('class', 'wheel-letter');
		let left = x - letter_circle_radius;
		let baseline = y + letter_center_to_baseline;
		text.setAttribute('x', x.toString());
		text.setAttribute('y', baseline.toString());
		text.textContent = letter;
		wheel.appendChild(text);
		}

	// Key letter.
	add_letter(key_letter, wheel_width / 2, wheel_height / 2);

	// The rest of the letters.
	let key_index = pangram.indexOf(key_letter);
	let remaining_letters = pangram.substr(0, key_index) + pangram.substr(key_index + 1);
	remaining_letters = scramble_word(remaining_letters);
	const num_remaining_letters = remaining_letters.length;
	for (let i = 0; i < num_remaining_letters; ++i) {
		let radians = i * (2 * Math.PI) / num_remaining_letters;
		add_letter(
			remaining_letters[i],
			wheel_width / 2 + wheel_radius * Math.cos(radians),
			wheel_height / 2 - wheel_radius * Math.sin(radians));
		}
	}

function start_word_wheel() {
	document.onkeydown = handle_key;
	get_puzzle();
	}


