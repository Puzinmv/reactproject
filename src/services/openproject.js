import axios from 'axios';

export const CreateProject = (id) => {
    let data = {
        "name": "имя проекта",
        "description": {
            "raw": "описание"
        },
        "public": false,
        "statusExplanation": {
            "raw": "описание статуса проекта"
        },
        "customField32": "цель проекта",
        "customField28": {
            "raw": "описание работ"
        },
        "customField29": 17,
        "customField30": 21,
        "customField33": {
            "raw": "адреса проведени¤ работ"
        },
        "customField34": {
            "raw": "ограничения со стороны исполнителей"
        },
        "_meta": {
            "copyMembers": true,
            "copyVersions": true,
            "copyCategories": true,
            "copyWorkPackages": true,
            "copyWorkPackageAttachments": true,
            "copyWiki": true,
            "copyWikiPageAttachments": true,
            "copyForums": true,
            "copyQueries": true,
            "copyBoards": true,
            "copyOverview": true,
            "copyStorages": true,
            "copyStorageProjectFolders": true,
            "copyFileLinks": true,
            "sendNotifications": false
        },
        "_links": {
            "status": {
                "href": "/api/v3/project_statuses/not_started"
            },
            "parent": {
                "href": null
            },
            "customField1": {
                "href": "/api/v3/users/22"
            }
        }
    };

    let config = {
        method: 'post',
        url: `https://openproject.asterit.ru/api/v3/projects/${id}/copy`,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Basic YXBpa2V5Ojk3ODVkODhlOWZlZDc2MzAyMmIyM2Y2MDJlMTE5Yzc4YWI5N2MxZDU3NmYxNzM0N2M2ZmFlMjRmYzZmYmZmMmY='
        },
        data: JSON.stringify(data)
    };

    axios.request(config)
        .then((response) => {
            return response.data
        })
        .catch((error) => {
            console.log(error);
            return null
        });

};


export default CreateProject;