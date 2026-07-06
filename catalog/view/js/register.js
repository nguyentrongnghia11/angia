// Register form module: submit to FormSubmit and keep user on the page
// High-readability code, minimal coupling with existing scripts

const COMPANY_EMAIL = 'haitran090197@gmail.com';
const FORMSUBMIT_ENDPOINT = `https://formsubmit.co/${COMPANY_EMAIL}`;
const FORMSUBMIT_AJAX_ENDPOINT = `https://formsubmit.co/ajax/${COMPANY_EMAIL}`;

function getInputValue(id) {
	const element = document.getElementById(id);
	return element ? String(element.value).trim() : '';
}

function ensureHiddenInput(form, name, value) {
	let input = form.querySelector(`input[name="${name}"]`);
	if (!input) {
		input = document.createElement('input');
		input.type = 'hidden';
		input.name = name;
		form.appendChild(input);
	}
	input.value = value;
}

function attachRegisterFormHandler() {
	const form = document.getElementById('register_form');
	const button = document.getElementById('btn-register-submit');
	if (!form || !button) return;

	// Normalize form attributes to avoid legacy handlers
	form.removeAttribute('onsubmit');
	form.method = 'POST';
	form.action = FORMSUBMIT_ENDPOINT;
	button.setAttribute('type', 'submit');

	// Hard block any legacy click handlers that may trigger AJAX to thegio.vn
	button.onclick = null;
	button.addEventListener('click', function (e) {
		// Prevent any other click listeners from firing
		e.stopImmediatePropagation();
	}, { capture: true });

	// Also intercept submit at the document level as a safety net
	document.addEventListener('submit', function (e) {
		if (e.target && /** @type {HTMLElement} */(e.target).id === 'register_form') {
			e.stopImmediatePropagation();
		}
	}, { capture: true });

	// Hidden configuration for FormSubmit
	ensureHiddenInput(form, '_subject', 'Đăng ký nhận tin - angia.org.vn');
	ensureHiddenInput(form, '_template', 'table');
	ensureHiddenInput(form, '_captcha', 'false');
	// Redirect URL if FormSubmit ever redirects (backup only)
	const currentUrl = window.location.href.split('#')[0];
	ensureHiddenInput(form, '_next', `${currentUrl}#submitted`);
	ensureHiddenInput(form, '_autoresponse', 'Cảm ơn bạn đã đăng ký. Chúng tôi sẽ liên hệ sớm.');

	form.addEventListener('submit', async (event) => {
		// Stop legacy handlers (both capture and bubble)
		event.preventDefault();
		event.stopPropagation();
		// @ts-ignore - stopImmediatePropagation exists in browsers
		if (typeof event.stopImmediatePropagation === 'function') event.stopImmediatePropagation();

		const fullName = getInputValue('nameregister');
		const phone = getInputValue('phoneregister');
		const email = getInputValue('emailregister');

		if (!fullName || !phone || !email) {
			alert('Vui lòng nhập đủ Họ và Tên, Số điện thoại và Email.');
			return;
		}

		const formData = new FormData(form);

		button.disabled = true;
		button.classList.add('loading');
		try {
			const response = await fetch(FORMSUBMIT_AJAX_ENDPOINT, {
				method: 'POST',
				headers: { 'Accept': 'application/json' },
				body: formData
			});
			if (!response.ok) throw new Error('Submit failed');
			// Optional: parse JSON to confirm
			await response.json().catch(() => ({}));
			// Không rời trang: báo thành công, reset, đóng popup qua hash
			alert('Gửi thông tin thành công. Cảm ơn bạn!');
			form.reset();
			window.history.pushState({}, '', currentUrl + '#submitted');
		} catch (error) {
			console.error('Register submit error:', error);
			// Không fallback sang submit thông thường để tránh rời trang
			alert('Hệ thống đang bận, vui lòng thử lại sau ít phút.');
		} finally {
			button.disabled = false;
			button.classList.remove('loading');
		}
	}, { capture: true });
}

document.addEventListener('DOMContentLoaded', attachRegisterFormHandler);