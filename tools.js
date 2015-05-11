module.exports = {
	merge: function(a, b) {
		for (var attrname in b) {
			a[attrname] = b[attrname];
		}
	},
	returnMerged : function (a, b){
		var c = {};
		for (var attrname in a) { c[attrname] = a[attrname]; }
		for (var attrname in b) { c[attrname] = b[attrname]; }
		return c;
	}
}