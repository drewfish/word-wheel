// Game play.
var pangram = '';
var key_letter = '';
var all_words = {};
var found_words = [];
var entered_word = "";
var total_frequency = 0;
var given_up = false;

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
var dictionary_url_prefix = "https://en.wiktionary.org/wiki/";
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
	else if (key == " ") {
		scramble_wheel();
		handled = true;
		}

	if (handled) {
		event.preventDefault();
		event.stopPropagation();
		}
	}

function enter_word() {
	if (given_up) {
		clear_entered_word();
		return;
		}

	if (!all_words[entered_word]) {
		indicate_word_error(entered_word);
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

function is_a_pangram(word) {
	if (word.length != pangram.length)
		return false;
	let letters_left = pangram;
	for (let i = 0; i < word.length; ++i) {
		let letter = word[i];
		let letter_index = letters_left.indexOf(letter);
		if (letter_index < 0)
			return false;
		letters_left =
			letters_left.substr(0, letter_index) + letters_left.substr(letter_index + 1);
		}
	return true;
	}

function build_found_words(already_found) {
	// Clear existing words.
	let element = document.getElementById("found-words");
	while (element.firstChild)
		element.removeChild(element.firstChild);

	// Rebuild the words.
	let started = false;
	let found_frequency = 0.0;
	let num_pangrams_found = 0;
	const max_word_length = pangram.length;

	// Add all the words.
	let words_to_show = given_up ? Object.keys(all_words).sort() : found_words;
	words_to_show.forEach(word => {
		// Comma.
		if (started)
			element.appendChild(document.createTextNode(", "));
		else
			started = true;

		// Word.
		let span = document.createElement("a");
		let class_str = "";
		if (!given_up) {
			let is_entered_word = word == entered_word;
			if (is_entered_word)
				class_str += (already_found ? "already-found " : "just-found ") + " ";
			found_frequency += all_words[word];
			}
		else {
			let unfound = !found_words.includes(word);
			if (unfound)
				class_str += "unfound ";
			if (!unfound)
				found_frequency += all_words[word];
			}
		let is_pangram = is_a_pangram(word);
		if (is_pangram)
			class_str += "max-length ";
		span.setAttribute("class", class_str);
		span.setAttribute("href", dictionary_url_prefix + word);
		span.textContent = word;
		element.appendChild(span);
		if (is_pangram && found_words.includes(word))
			num_pangrams_found += 1;
		});


	// Show stats.
	let message =
		`Found ${found_words.length} out of ${Object.keys(all_words).length} words.`;
	if (num_pangrams_found > 0) {
		if (num_pangrams_found > 1)
			message += ` You've found ${num_pangrams_found} pangrams.`;
		else
			message += ` You've found a pangram.`;
		}
	if (total_frequency > 0) {
		let percentage = Math.floor(100 * found_frequency / total_frequency);
		message += ` You've found ${percentage}% of the total words by frequency.`;
		}
	document.getElementById("status").textContent = message;
	document.getElementById("give-up").removeAttribute("hidden");

	// Nobody ever gets *all* the words, but in case someone does...
	if (found_words.length >= Object.keys(all_words).length)
		document.getElementById("give-up").setAttribute("hidden", "hidden");
	}

function indicate_word_error(entered_word) {
	document.getElementById("cur-word").setAttribute("error", "error");
	if (entered_word.indexOf(key_letter) < 0)
		document.getElementById("key-letter-circle").setAttribute("error", "error");
	error_timeout_id = setTimeout(clear_word_error_indication, error_flash_ms);
	}

function clear_word_error_indication() {
	document.getElementById("cur-word").removeAttribute("error");
	document.getElementById("key-letter-circle").removeAttribute("error");
	clear_entered_word();
	build_found_words(false);
	error_timeout_id = 0;
	}

function clear_entered_word() {
	entered_word = "";
	document.getElementById("cur-word").textContent = nbsp;
	}

function give_up() {
	given_up = true;
	build_found_words();
	document.getElementById("give-up").setAttribute("hidden", "hidden");
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

function build_wheel() {
	let wheel = document.getElementById("wheel");
	const [wheel_width, wheel_height] = [ 1000, 1000 ];
	function add_letter(letter, x, y, is_key) {
		// Circle.
		let circle = document.createElementNS(svgNS, 'circle');
		circle.setAttribute('class', 'letter-circle');
		circle.setAttribute('cx', x.toString());
		circle.setAttribute('cy', y.toString());
		circle.setAttribute('r', letter_circle_radius.toString());
		if (is_key)
			circle.setAttribute('id', 'key-letter-circle');
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
	add_letter(key_letter, wheel_width / 2, wheel_height / 2, true);

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
			wheel_height / 2 - wheel_radius * Math.sin(radians),
			false);
		}
	}

function scramble_wheel() {
	// Clear current wheel.
	let wheel = document.getElementById("wheel");
	while (wheel.firstChild)
		wheel.removeChild(wheel.firstChild);

	build_wheel();
	}

function start_puzzle(text) {
	log("Got puzzle.");

	// Parse the puzzle.
	let lines = text.split('\n');
	[pangram, key_letter] = lines.shift().split(' ');
	all_words = {};
	total_frequency = 0.0;
	lines.forEach(line => {
		let fields = line.split(' ');
		if (fields.length == 0 || fields[0].length == 0)
			return;
		let frequency = fields.length > 1 ? parseFloat(fields[1]) : NaN;
		all_words[fields[0]] = frequency;
		total_frequency += frequency;
		});

	build_wheel();
	}

function start_word_wheel() {
	document.onkeydown = handle_key;
	document.getElementById("give-up-link").onclick = give_up;
	get_puzzle();
	}


