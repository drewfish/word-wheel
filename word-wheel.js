// Game play.
var pangram = '';
var key_letter = '';
var all_words = [];

// Style.
// The SVG inner dimensions are 1000x1000.
const letter_circle_radius = 80;
const letter_center_to_baseline = 0;
const wheel_radius = (1000 - letter_circle_radius - 200) / 2;
const svgNS = "http://www.w3.org/2000/svg";

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
		message = "\u00A0";
	document.getElementById("status").textContent = message;
	}


function handle_key(event) {
	if (!event)
		event = window.event;

	let handled = false;

	let key = event.keyCode;
	if (key == 0)
		key = event.which;
	key = String.fromCharCode(key);

	//***

	if (handled) {
		event.preventDefault();
		event.stopPropagation();
		}
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
	document.onkeypress = handle_key;
	get_puzzle();
	}


