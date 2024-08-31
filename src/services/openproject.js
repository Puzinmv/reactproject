import axios from 'axios';

function generateTableOnTrip(data) {
    let tableHtml = `
    <figure class="table op-uc-figure_align-center op-uc-figure">
    <table border="1" cellpadding="5" cellspacing="0">
      <thead>
        <tr>
          <th>№</th>
          <th>Адрес проведения работ</th>
          <th>Количество дней</th>
          <th>Какие работы проводятся по указанным адресам</th>
        </tr>
      </thead>
      <tbody>
  `;

    data.forEach((item, index) => {
        tableHtml += `
      <tr>
        <td>${index}</td>
        <td>${item.Address}</td>
        <td>${item.DayOnTrip}</td>
        <td>${item.JobDecription}</td>
      </tr>
    `;
    });

    tableHtml += `
      </tbody>
    </table>
    </figure>
  `;

    return tableHtml;
}
function generateTableJob(data) {
    let tableHtml = `
    <figure class="table op-uc-figure_align-center op-uc-figure">
    <table border="1" cellpadding="5" cellspacing="0">
      <thead>
        <tr>
          <th>№</th>
          <th>Наименование работ</th>
          <th>Ресурсная</th>
          <th>Рамочная</th>
        </tr>
      </thead>
      <tbody>
  `;

    data.forEach((item, index) => {
        tableHtml += `
      <tr>
        <td>${index}</td>
        <td>${item.jobName}</td>
        <td>${item.resourceDay}</td>
        <td>${item.frameDay}</td>
      </tr>
    `;
    });

    tableHtml += `
      </tbody>
    </table>
    </figure>
  `;

    return tableHtml;
}

export const CreateProject = (formData) => {
    const data = {
        "name": formData.title,
        "description": {
            "raw": formData.Description
        },
        "public": false,
        //"statusExplanation": {
        //    "raw": "описание статуса проекта"
        //},
        //"customField32": "цель проекта",
        "customField20": formData.Customer,
        "customField23": formData.CustomerCRMID,
        "customField24": formData.CustomerContact,
        "customField25": {
            "raw": formData.CustomerContactJobTitle + ' '+ formData.CustomerContactEmail + ' ' + formData.CustomerContactTel
        },
        "customField28": {
            "format": "markdown",
            "raw": generateTableJob(formData.JobDescription),
            "html": generateTableJob(formData.JobDescription)
        },
        "customField29": formData.resourceSumm,
        "customField30": formData.frameSumm,
        "customField31": `http://projectcard.asterit.ru/?id=${formData.id}`,
        "customField33": {
            "format": "markdown",
            "raw": generateTableOnTrip(formData.JobOnTripTable),
            "html": generateTableOnTrip(formData.JobOnTripTable)
        },
        "customField34": {
            "raw": formData.Limitations,
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
            "sendNotifications": true
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

    const config = {
        method: 'post',
        url: `https://openproject.asterit.ru/api/v3/projects/${formData.OpenProject_Template_id}/copy`,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Basic YXBpa2V5Ojk3ODVkODhlOWZlZDc2MzAyMmIyM2Y2MDJlMTE5Yzc4YWI5N2MxZDU3NmYxNzM0N2M2ZmFlMjRmYzZmYmZmMmY='
        },
        data: JSON.stringify(data)
    };

    return axios.request(config)
        .then((response) => {
            return response.data
        })
        .catch((error) => {
            console.log(error);
            return null
        });

};

export const GetProjectTemtplate = async () => {
    const config = {
        method: 'get',
        url: `https://openproject.asterit.ru/api/v3/projects?filters=[{"templated":{"operator":"=","values":["t"]}}]`,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Basic YXBpa2V5Ojk3ODVkODhlOWZlZDc2MzAyMmIyM2Y2MDJlMTE5Yzc4YWI5N2MxZDU3NmYxNzM0N2M2ZmFlMjRmYzZmYmZmMmY='
        },
        data: JSON.stringify({})
    };
    
    const data = await axios.request(config)
        .then((response) => {
            let templateOption = []
            if (Array.isArray(response.data._embedded.elements)) {
                response.data._embedded.elements.map((item) => templateOption.push({ name: item.name, value: item.id }))
            }
            return templateOption
        })
        .catch((error) => {
            console.log(error);
            return []
        });
    
    return data
};


export default CreateProject;