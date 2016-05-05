module.exports = {
	setState(element, state) {
		if (!(element instanceof HTMLElement)) return;
		if (isEmptyObject(state)) return;

		const dataSet = element.dataset;
		Object.keys(state).forEach((key) => {
			const value = state[key];
			if (value === null || value === false) {
				Reflect.deleteProperty(dataSet, key);
			} else if (value !== undefined) {
				dataSet[key] = value;
			}
		});
	},
	getState(element, key) {
		if (!(element instanceof HTMLElement)) return;
		if (!key) return;
		return element.dataset[key];
	}
};

function isEmptyObject(object) {
	return Object.keys(object).length === 0;
}
