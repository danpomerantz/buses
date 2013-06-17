exports.GetTagsByXPath = GetTagsByXPath;
exports.GetAttribute = GetAttribute;
exports.GetTagByXPath = GetTagByXPath;

function GetTagsByXPathAsync(json, xpath, callback)
{
	callback(GetTagsByXPath(json, xpath));
}

function GetAttribute(json, attributeName)
{
	if (json.attribs == undefined)
	{
		return undefined;
	}

	return json.attribs[attributeName];
}

//returns the first tag
function GetTagByXPath(json, xpath)
{
	var results = GetTagsByXPath(json, xpath);
	if (results.length == 0)
	{
		return undefined;
	}

	return results[0];
}

//xpath looks like:
//foo/bar[@attributeName1;@attributeName2]/blah
//ex: html/body
//base case: path is empty, return json
//otherwise:
//find tag matching with name and attributes
//search among all of its children for final result
//search for node with xpath in json
//Node is an object with several properties: raw, data, type, name, attribs, children
//children is a list of node
function GetTagsByXPath(json, xpath)
{
	//we reached the correct place
	//return current node
	if (xpath == "") {
		return [json];
	}

	//no node found as we reached a leaf
	if (json == undefined)
	{
		return [];
	}

	var pieces = xpath.split('/');
	//pieces.shift() removes the first element from the array and return it
	var queryPiece = pieces.shift();
	var combined = pieces.join("/");
	
	var results = new Array();
	for (var i = 0; i < json.length; i++)
	{
		if (MatchesTagAndAttribute(json[i], queryPiece))
		{
			//if it is already the last step
			if (combined.length == 0)
			{
				results.push(json[i]);
			}
			else
			{
				//recursively call on every child
				//looks within every child for path of combined
				results = results.concat(GetTagsByXPath(json[i].children, combined));
	
			}
		}
	}

	return results;
}

//tagAndAttribute is a string that looks like foo[attribute1=value1;attribute2]
function MatchesTagAndAttribute(node, tagAndAttribute)
{
	var attributeList = new Array();
	var nodeName = tagAndAttribute;
	var indexStartBracket = tagAndAttribute.indexOf('[');
	if (indexStartBracket >= 0)
	{
		nodeName = tagAndAttribute.substring(0, indexStartBracket);
		//generate the attribute list
		attributeList = ExtractTextFromBrackets(tagAndAttribute).split(';');
	}

	if (node.type == "tag" && node.name == nodeName && ContainsAttributes(node, attributeList))
	{
		return true;
	}

	return false;
}

//input : foo[abc] (type: String)
//output : abc (type: String)
function ExtractTextFromBrackets(tagAndAttribute)
{
	var indexStartBracket = tagAndAttribute.indexOf('[');
	var indexEndBracket = tagAndAttribute.indexOf(']');
	return tagAndAttribute.substr(indexStartBracket + 1, indexEndBracket - indexStartBracket - 1)

}

function ContainsAttributes(node, attributeList)
{
	//if no attributes required then automatically return true
	if (attributeList.length == 0)
	{
		return true;
	}

	//if searching for attribute but there are none, return false
	if (node.attribs == undefined)
	{
		return false;
	}

	for (var i = 0; i < attributeList.length; i++)
	{
		//check to see if attributeList[i] is of the form attribute or attribute=value
		var rawAttribute = attributeList[i];
		var attributePieces = rawAttribute.split('=');
		var attributeName = "";
		var attributeValue = "";
		if (attributePieces.length == 1) {
			attributeName = rawAttribute;
		}
		else
		{
			attributeName = attributePieces[0];
			attributeValue = attributePieces[1];
		}

		if (node.attribs[attributeName] == undefined)
		{
			return false;
		}

		if (attributeValue != "" && attributeValue != node.attribs[attributeName])
		{
			return false;
		}
	}

	return true;
}