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

function setupFormHandler({ formId, submitBtnId, nameId, phoneId, emailId, subjectText }) {
	const form = document.getElementById(formId);
	const button = document.getElementById(submitBtnId);
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

	// Hidden configuration for FormSubmit
	ensureHiddenInput(form, '_subject', subjectText);
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

		const fullName = getInputValue(nameId);
		const phone = getInputValue(phoneId);
		const email = getInputValue(emailId);

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
			// Không rời trang: báo thành công, reset
			alert('Gửi thông tin thành công. Cảm ơn bạn!');
			form.reset();
			
			// Reset text input fields labels placeholder
			form.querySelectorAll('.input-text, .input-area').forEach((el) => {
				const holder = el.querySelector('.holder');
				if (holder) holder.classList.remove('hide');
			});

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

function attachRegisterFormHandlers() {
	// 1. Popup Form cũ
	setupFormHandler({
		formId: 'register_form',
		submitBtnId: 'btn-register-submit',
		nameId: 'nameregister',
		phoneId: 'phoneregister',
		emailId: 'emailregister',
		subjectText: 'Đăng ký nhận tin - angia.org.vn'
	});

	// 2. Form Liên hệ mới ở chân trang
	setupFormHandler({
		formId: 'register_form_contact',
		submitBtnId: 'btn-register-submit-contact',
		nameId: 'nameregister_contact',
		phoneId: 'phoneregister_contact',
		emailId: 'emailregister_contact',
		subjectText: 'Đăng ký nhận tin (Liên hệ) - angia.org.vn'
	});

	// Chặn submit bọt cho cả hai form ở cấp độ document
	document.addEventListener('submit', function (e) {
		if (e.target && (/** @type {HTMLElement} */(e.target).id === 'register_form' || /** @type {HTMLElement} */(e.target).id === 'register_form_contact')) {
			e.stopImmediatePropagation();
		}
	}, { capture: true });
}

document.addEventListener('DOMContentLoaded', attachRegisterFormHandlers);